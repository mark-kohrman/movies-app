import "server-only";

const API_BASE_URL = "https://www.omdbapi.com/";

export type MovieSummary = {
  id: string;
  title: string;
  year: string;
  posterUrl: string | null;
  rating: number | null;
};

export type MovieDetails = MovieSummary & {
  plot: string;
  released: string;
  runtime: string;
  genres: string[];
  rated: string;
  director: string;
  actors: string;
};

type OmdbSearchItem = {
  Title: string;
  Year: string;
  imdbID: string;
  Poster: string;
};

type OmdbSearchResponse = {
  Response: "True" | "False";
  Search?: OmdbSearchItem[];
  Error?: string;
};

type OmdbMovieResponse = {
  Response: "True" | "False";
  Error?: string;
  Title: string;
  Year: string;
  imdbID: string;
  Poster: string;
  imdbRating: string;
  Plot: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Rated: string;
  Director: string;
  Actors: string;
};

export class OmdbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OmdbError";
  }
}

function getApiKey() {
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    throw new OmdbError(
      "Movie search is not configured yet. Add an OMDB_API_KEY to your local .env.local file.",
    );
  }

  return apiKey;
}

async function omdbFetch<T extends { Response: "True" | "False"; Error?: string }>(
  params: URLSearchParams,
): Promise<T> {
  params.set("apikey", getApiKey());

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
      cache: "no-store",
    });
  } catch {
    throw new OmdbError("Unable to reach OMDb right now. Please try again.");
  }

  if (!response.ok) {
    throw new OmdbError(
      `OMDb could not complete the request (status ${response.status}). Please try again.`,
      response.status,
    );
  }

  let result: T;
  try {
    result = (await response.json()) as T;
  } catch {
    throw new OmdbError("OMDb returned an unreadable response. Please try again.");
  }

  if (result.Response === "False") {
    if (result.Error === "Movie not found!") {
      throw new OmdbError("That movie could not be found.", 404);
    }

    if (result.Error === "Invalid API key!") {
      throw new OmdbError(
        "The OMDb API key is invalid. Check the OMDB_API_KEY in your .env.local file.",
        401,
      );
    }

    throw new OmdbError(
      result.Error
        ? `OMDb error: ${result.Error}`
        : "OMDb could not complete the request. Please try again.",
    );
  }

  return result;
}

export async function searchMovies(query: string): Promise<MovieSummary[]> {
  const params = new URLSearchParams({ s: query, type: "movie" });
  let result: OmdbSearchResponse;
  try {
    result = await omdbFetch<OmdbSearchResponse>(params);
  } catch (error) {
    if (error instanceof OmdbError && error.status === 404) {
      return [];
    }
    throw error;
  }

  return (result.Search ?? []).map((movie) => ({
    id: movie.imdbID,
    title: movie.Title,
    year: movie.Year,
    posterUrl: movie.Poster !== "N/A" ? movie.Poster : null,
    rating: null,
  }));
}

export async function getMovieDetails(id: string): Promise<MovieDetails> {
  const params = new URLSearchParams({ i: id, plot: "full" });
  const movie = await omdbFetch<OmdbMovieResponse>(params);
  const rating = Number(movie.imdbRating);

  return {
    id: movie.imdbID,
    title: movie.Title,
    year: movie.Year,
    posterUrl: movie.Poster !== "N/A" ? movie.Poster : null,
    rating: Number.isFinite(rating) ? rating : null,
    plot: movie.Plot !== "N/A" ? movie.Plot : "",
    released: movie.Released !== "N/A" ? movie.Released : "",
    runtime: movie.Runtime !== "N/A" ? movie.Runtime : "",
    genres:
      movie.Genre !== "N/A"
        ? movie.Genre.split(",").map((genre) => genre.trim())
        : [],
    rated: movie.Rated !== "N/A" ? movie.Rated : "",
    director: movie.Director !== "N/A" ? movie.Director : "",
    actors: movie.Actors !== "N/A" ? movie.Actors : "",
  };
}
