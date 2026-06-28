namespace Liftonom.Api.Services;

/// <summary>Laravel abort($code, $message) karşılığı — JSON {message} olarak döner.</summary>
public class ApiException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
