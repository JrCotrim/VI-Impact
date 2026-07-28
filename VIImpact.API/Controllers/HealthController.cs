using Microsoft.AspNetCore.Mvc;

namespace VIImpact.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            Status = "Online",
            Project = "VI Impact",
            Version = "1.0.0"
        });
    }
}