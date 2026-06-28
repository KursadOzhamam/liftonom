using System.Text.RegularExpressions;

namespace Liftonom.Api.Services;

/// <summary>Türk telefon numarasını E.164'e (+90XXXXXXXXXX) çevirir.</summary>
public static partial class PhoneHelper
{
    [GeneratedRegex(@"\D")] private static partial Regex NonDigits();
    [GeneratedRegex(@"^\+905\d{9}$")] private static partial Regex Valid();

    public static string Normalize(string input)
    {
        var digits = NonDigits().Replace(input, "");
        if (digits.StartsWith("90") && digits.Length == 12) digits = digits[2..];
        else if (digits.StartsWith("0") && digits.Length == 11) digits = digits[1..];
        return "+90" + digits;
    }

    public static bool IsValid(string input) => Valid().IsMatch(Normalize(input));
}
