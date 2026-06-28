using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Services;

/// <summary>Arıza yaşam döngüsünde müşteriye/yöneticiye otonom WhatsApp bilgilendirme.</summary>
public class FaultNotificationService(AppDbContext db, IWhatsAppSender whatsapp)
{
    public enum Stage { Created, Dispatched, Diagnosed, Resolved }

    public async Task NotifyAsync(FaultReport fault, Stage stage)
    {
        // Alıcı + bağlam çöz: arıza → asansör → bina → (yönetici tel / müşteri tel)
        var ctx = await db.Elevators.IgnoreQueryFilters()
            .Where(e => e.Id == fault.ElevatorId)
            .Select(e => new
            {
                ElevatorName = e.Name,
                ManagerPhone = e.Building!.ManagerPhone,
                CustomerPhone = e.Building.Customer!.Phone,
            })
            .FirstOrDefaultAsync();

        var phone = ctx?.ManagerPhone ?? ctx?.CustomerPhone;
        if (string.IsNullOrWhiteSpace(phone)) return; // alıcı yoksa sessizce geç

        var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == fault.TenantId);
        var firm = tenant?.Name ?? "Liftonom";
        var asansor = ctx?.ElevatorName ?? "asansör";

        var message = stage switch
        {
            Stage.Created => $"Sayın müşterimiz, {asansor} için arıza kaydınız alındı (No: #{fault.Id}). En kısa sürede ilgileneceğiz. — {firm}",
            Stage.Dispatched => $"Teknisyenimiz {asansor} arızası için yola çıktı. — {firm}",
            Stage.Diagnosed => $"{asansor} arızası tespit edildi. Tahmini onarım süresi: {fault.EstimatedRepair ?? "belirleniyor"}. — {firm}",
            Stage.Resolved => $"{asansor} arızanız giderildi. İlginiz için teşekkür ederiz. — {firm}",
            _ => "",
        };

        await whatsapp.SendAsync(fault.TenantId, phone!, message, $"fault_{stage.ToString().ToLower()}", fault.Id);
    }
}
