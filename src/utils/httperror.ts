class HttpError extends Error {
  statusCode: number; // Define a custom property to hold the HTTP status code
  constructor(message: string, statusCode: number) {
    super(message); // Call the parent class's constructor
    this.statusCode = statusCode; // Add a custom statusCode property
  }
}

export default HttpError;
