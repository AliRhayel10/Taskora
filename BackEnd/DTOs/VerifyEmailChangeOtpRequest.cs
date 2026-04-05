namespace BackEnd.DTOs
{
    public class VerifyEmailChangeOtpRequest
    {
        public int UserId { get; set; }
        public string Otp { get; set; } = string.Empty;
    }
}
