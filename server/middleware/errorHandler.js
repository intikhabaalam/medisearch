const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || (res.statusCode > 200 ? res.statusCode : 500);

    // Map common client errors to proper status codes
    if (err.name === 'MulterError') {
        statusCode = 400;
    } else if (err.message && err.message.includes('Invalid file type')) {
        statusCode = 400;
    }

    console.error("Backend Error caught:", err.message);

    res.status(statusCode).json({
        error: err.message,
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : null
    });
};

export default errorHandler;
