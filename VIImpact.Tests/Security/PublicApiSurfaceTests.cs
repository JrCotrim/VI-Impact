using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using VIImpact.API.Controllers;

namespace VIImpact.Tests.Security;

/// <summary>
/// Protects the intentionally read-only public GTA event HTTP surface.
/// </summary>
public sealed class PublicApiSurfaceTests
{
    [Fact]
    public void GtaEventsController_DoesNotExposeWriteEndpoints()
    {
        Type[] writeAttributeTypes =
        [
            typeof(HttpPostAttribute),
            typeof(HttpPutAttribute),
            typeof(HttpPatchAttribute),
            typeof(HttpDeleteAttribute)
        ];

        MethodInfo[] writeEndpoints =
            typeof(GtaEventsController)
                .GetMethods(
                    BindingFlags.Instance |
                    BindingFlags.Public |
                    BindingFlags.DeclaredOnly)
                .Where(method =>
                    method
                        .GetCustomAttributes(inherit: true)
                        .Any(attribute =>
                            writeAttributeTypes.Contains(
                                attribute.GetType())))
                .ToArray();

        Assert.Empty(writeEndpoints);
    }
}
