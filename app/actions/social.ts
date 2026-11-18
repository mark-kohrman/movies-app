"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type SocialActionState = {
  error?: string;
  success?: string;
  username?: string;
};

async function getSignedInClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Social features are not configured.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Could not verify the user for a social action", error);
    throw new Error("We couldn’t verify your account. Please try again.");
  }

  if (!data.user) {
    throw new Error("Sign in to use social features.");
  }

  return { supabase, user: data.user };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function saveMovieUsername(
  _previousState: SocialActionState,
  formData: FormData,
): Promise<SocialActionState> {
  const username = formData.get("username");

  if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return { error: "Use 3–24 letters, numbers, or underscores." };
  }

  try {
    const { supabase } = await getSignedInClient();
    const { error } = await supabase.rpc("set_my_movie_username", {
      requested_username: username,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/connections");
    return {
      success: "Your username is ready to share.",
      username: username.toLowerCase(),
    };
  } catch (error) {
    return {
      error: getErrorMessage(error, "Your username could not be saved."),
    };
  }
}

export async function requestMovieConnection(
  _previousState: SocialActionState,
  formData: FormData,
): Promise<SocialActionState> {
  const username = formData.get("username");

  if (
    typeof username !== "string" ||
    username.trim().length < 3 ||
    username.trim().length > 254
  ) {
    return { error: "Enter the other user’s username." };
  }

  try {
    const { supabase } = await getSignedInClient();
    const { error } = await supabase.rpc("request_movie_connection", {
      target_username: username.trim(),
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/connections");
    return { success: "Connection request sent." };
  } catch (error) {
    return {
      error: getErrorMessage(error, "The connection request could not be sent."),
    };
  }
}

export async function respondToMovieConnection(
  _previousState: SocialActionState,
  formData: FormData,
): Promise<SocialActionState> {
  const connectionId = formData.get("connectionId");
  const decision = formData.get("decision");

  if (
    typeof connectionId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(connectionId) ||
    (decision !== "accept" && decision !== "decline")
  ) {
    return { error: "That connection request could not be updated." };
  }

  try {
    const { supabase } = await getSignedInClient();
    const { error } = await supabase.rpc("respond_to_movie_connection", {
      requested_connection_id: connectionId,
      accept_request: decision === "accept",
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/connections");
    revalidatePath("/shared-reviews");
    return {
      success:
        decision === "accept"
          ? "Connection accepted."
          : "Connection request declined.",
    };
  } catch (error) {
    return {
      error: getErrorMessage(error, "The connection request could not be updated."),
    };
  }
}

export async function removeMovieConnection(
  _previousState: SocialActionState,
  formData: FormData,
): Promise<SocialActionState> {
  const connectionId = formData.get("connectionId");

  if (
    typeof connectionId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(connectionId)
  ) {
    return { error: "That connection could not be removed." };
  }

  try {
    const { supabase } = await getSignedInClient();
    const { error } = await supabase.rpc("remove_movie_connection", {
      requested_connection_id: connectionId,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/connections");
    revalidatePath("/shared-reviews");
    return { success: "Connection removed." };
  } catch (error) {
    return {
      error: getErrorMessage(error, "The connection could not be removed."),
    };
  }
}

export async function addReviewComment(
  _previousState: SocialActionState,
  formData: FormData,
): Promise<SocialActionState> {
  const ratingUserId = formData.get("ratingUserId");
  const movieId = formData.get("movieId");
  const body = formData.get("body");

  if (
    typeof ratingUserId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(ratingUserId) ||
    typeof movieId !== "string" ||
    !/^tt\d+$/.test(movieId) ||
    typeof body !== "string" ||
    body.trim().length < 1 ||
    body.length > 2000
  ) {
    return { error: "Comments must be between 1 and 2,000 characters." };
  }

  try {
    const { supabase, user } = await getSignedInClient();
    const { error } = await supabase.from("movie_rating_comments").insert({
      rating_user_id: ratingUserId,
      movie_id: movieId,
      user_id: user.id,
      body: body.trim(),
    });

    if (error) {
      console.error("Could not add a review comment", error);
      return {
        error:
          "Your comment could not be added. Make sure the social reviews database setup has been applied.",
      };
    }

    revalidatePath("/shared-reviews");
    return { success: "Comment added." };
  } catch (error) {
    return { error: getErrorMessage(error, "Your comment could not be added.") };
  }
}

export async function deleteReviewComment(
  _previousState: SocialActionState,
  formData: FormData,
): Promise<SocialActionState> {
  const commentId = formData.get("commentId");

  if (
    typeof commentId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(commentId)
  ) {
    return { error: "That comment could not be deleted." };
  }

  try {
    const { supabase } = await getSignedInClient();
    const { error, count } = await supabase
      .from("movie_rating_comments")
      .delete({ count: "exact" })
      .eq("id", commentId);

    if (error) {
      console.error("Could not delete a review comment", error);
      return { error: "Your comment could not be deleted. Please try again." };
    }

    if (count === 0) {
      return {
        error: "You can delete only your own comments or comments on your review.",
      };
    }

    revalidatePath("/shared-reviews");
    revalidatePath("/my-ratings");
    return { success: "Comment deleted." };
  } catch (error) {
    return {
      error: getErrorMessage(error, "Your comment could not be deleted."),
    };
  }
}
