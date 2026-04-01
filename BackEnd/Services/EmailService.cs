using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

public class EmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendOtpAsync(string toEmail, string otp)
    {
        var email = new MimeMessage();
        email.From.Add(MailboxAddress.Parse(_config["EmailSettings:From"]));
        email.To.Add(MailboxAddress.Parse(toEmail));
        email.Subject = "Taskora Password Reset Code";

        email.Body = new TextPart("plain")
        {
            Text = $"Your OTP is: {otp}. It expires in 10 minutes."
        };

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(
            _config["EmailSettings:Host"],
            int.Parse(_config["EmailSettings:Port"]),
            SecureSocketOptions.StartTls
        );

        await smtp.AuthenticateAsync(
            _config["EmailSettings:Username"],
            _config["EmailSettings:Password"]
        );

        await smtp.SendAsync(email);
        await smtp.DisconnectAsync(true);
    }
}