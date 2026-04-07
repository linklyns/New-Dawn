using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using New_Dawn.DTOs;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    IPasswordHasher<ApplicationUser> passwordHasher) : ControllerBase
{
    private const string AuthenticatorUriFormat = "otpauth://totp/{0}:{1}?secret={2}&issuer={0}&digits=6";

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { success = false, errors = result.Errors.Select(e => e.Description) });

        await userManager.AddToRoleAsync(user, "Donor");

        var token = await GenerateJwtToken(user, new[] { "Donor" });
        return Ok(new AuthResponse
        {
            Token = token,
            Email = user.Email!,
            DisplayName = user.DisplayName,
            Role = "Donor",
            RequiresMfa = false
        });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized(new { success = false, message = "Invalid credentials" });

        var passwordCheck = passwordHasher.VerifyHashedPassword(user, user.PasswordHash!, request.Password);
        var passwordValid = passwordCheck == PasswordVerificationResult.Success
            || passwordCheck == PasswordVerificationResult.SuccessRehashNeeded;

        if (!passwordValid)
            return Unauthorized(new { success = false, message = "Invalid credentials" });

        if (user.TwoFactorEnabled)
        {
            return Ok(new AuthResponse
            {
                RequiresMfa = true,
                Email = user.Email!
            });
        }

        var role = ResolveRoleForUser(user);
        var token = await GenerateJwtToken(user, new[] { role });
        return Ok(new AuthResponse
        {
            Token = token,
            Email = user.Email!,
            DisplayName = user.DisplayName,
            Role = role,
            RequiresMfa = false
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        return Ok(new { success = true, message = "Logged out successfully" });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await userManager.FindByIdAsync(userId!);
        if (user == null)
            return NotFound(new { success = false, message = "User not found" });

        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        if (string.IsNullOrWhiteSpace(role))
        {
            role = ResolveRoleForUser(user);
        }

        return Ok(new
        {
            email = user.Email,
            displayName = user.DisplayName,
            role,
            has2fa = user.TwoFactorEnabled
        });
    }

    [HttpPost("mfa/setup")]
    [Authorize]
    public async Task<IActionResult> MfaSetup()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await userManager.FindByIdAsync(userId!);
        if (user == null)
            return NotFound(new { success = false, message = "User not found" });

        var unformattedKey = await userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(unformattedKey))
        {
            await userManager.ResetAuthenticatorKeyAsync(user);
            unformattedKey = await userManager.GetAuthenticatorKeyAsync(user);
        }

        var email = await userManager.GetEmailAsync(user);
        var authenticatorUri = string.Format(
            AuthenticatorUriFormat,
            UrlEncoder.Default.Encode("NewDawn"),
            UrlEncoder.Default.Encode(email!),
            unformattedKey);

        return Ok(new MfaSetupResponse
        {
            SharedKey = unformattedKey!,
            AuthenticatorUri = authenticatorUri
        });
    }

    [HttpPost("mfa/enable")]
    [Authorize]
    public async Task<IActionResult> MfaEnable([FromBody] MfaVerifyRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await userManager.FindByIdAsync(userId!);
        if (user == null)
            return NotFound(new { success = false, message = "User not found" });

        var isValid = await userManager.VerifyTwoFactorTokenAsync(
            user,
            userManager.Options.Tokens.AuthenticatorTokenProvider,
            request.Code);

        if (!isValid)
            return BadRequest(new { success = false, message = "Invalid verification code" });

        await userManager.SetTwoFactorEnabledAsync(user, true);
        return Ok(new { success = true, message = "2FA has been enabled" });
    }

    [HttpPost("mfa/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> MfaVerify([FromBody] MfaVerifyRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized(new { success = false, message = "Invalid credentials" });

        var isValid = await userManager.VerifyTwoFactorTokenAsync(
            user,
            userManager.Options.Tokens.AuthenticatorTokenProvider,
            request.Code);

        if (!isValid)
            return Unauthorized(new { success = false, message = "Invalid verification code" });

        var role = ResolveRoleForUser(user);
        var token = await GenerateJwtToken(user, new[] { role });
        return Ok(new AuthResponse
        {
            Token = token,
            Email = user.Email!,
            DisplayName = user.DisplayName,
            Role = role,
            RequiresMfa = false
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await userManager.FindByIdAsync(userId!);
        if (user == null)
            return NotFound(new { success = false, message = "User not found" });

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { success = false, errors = result.Errors.Select(e => e.Description) });

        return Ok(new { success = true, message = "Password changed successfully" });
    }

    private Task<string> GenerateJwtToken(ApplicationUser user, IEnumerable<string> roles)
    {
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong";

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new("userId", user.Id)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds);

        return Task.FromResult(new JwtSecurityTokenHandler().WriteToken(token));
    }

    private static string ResolveRoleForUser(ApplicationUser user)
    {
        var email = user.Email?.Trim().ToLowerInvariant();

        return email switch
        {
            "admin@newdawn.ph" => "Admin",
            "mfa@newdawn.ph" => "Admin",
            "donor@newdawn.ph" => "Donor",
            _ => "Donor"
        };
    }
}
