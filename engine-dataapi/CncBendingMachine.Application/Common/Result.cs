namespace CncBendingMachine.Application.Common;

/// <summary>
/// Result wrapper for command/query responses
/// </summary>
public class Result
{
    public bool Success { get; private set; }
    public string? Error { get; private set; }
    public string? Message { get; private set; }

    protected Result(bool success, string? error = null, string? message = null)
    {
        Success = success;
        Error = error;
        Message = message;
    }

    public static Result Ok(string? message = null) => new(true, null, message);
    public static Result Fail(string error) => new(false, error);

    public static Result<T> Ok<T>(T data, string? message = null) => Result<T>.Ok(data, message);
    public static Result<T> Fail<T>(string error) => Result<T>.Fail(error);
}

/// <summary>
/// Result wrapper with data
/// </summary>
public class Result<T> : Result
{
    public T? Data { get; private set; }

    private Result(bool success, T? data, string? error, string? message)
        : base(success, error, message)
    {
        Data = data;
    }

    public static Result<T> Ok(T data, string? message = null) => new(true, data, null, message);
    public static new Result<T> Fail(string error) => new(false, default, error, null);
}
