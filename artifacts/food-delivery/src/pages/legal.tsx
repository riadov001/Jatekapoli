import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const sections = [
  {
    id: "mentions",
    title: "Mentions légales",
    content: `**Éditeur**
Jatek SAS — Société par Actions Simplifiée au capital de 10 000 €
Siège social : 12 Rue du Commerce, 60000 Oujda, Maroc
RCS Oujda B 123 456 789
Directeur de la publication : Équipe Jatek
Contact : legal@tawsila.ma

**Hébergeur**
Replit Inc. — 111 Minna Street, San Francisco, CA 94105, USA

**Propriété intellectuelle**
L'ensemble du contenu de la plateforme Jatek (marque, logo, textes, graphiques, interface) est la propriété exclusive de Jatek SAS et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction est interdite sans autorisation préalable écrite.`,
  },
  {
    id: "cgu",
    title: "Conditions Générales d'Utilisation (CGU)",
    content: `**Article 1 — Objet**
Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de la plateforme Jatek (site web et application mobile) par tout utilisateur.

**Article 2 — Accès au service**
L'accès au service est gratuit. L'utilisateur doit être âgé d'au moins 18 ans et disposer d'un numéro de téléphone valide pour créer un compte.

**Article 3 — Commandes**
Toute commande passée via Jatek est ferme et définitive. L'utilisateur s'engage à payer le montant total indiqué au moment de la validation. En cas d'annulation, les politiques du commerçant s'appliquent.

**Article 4 — Livraison**
Les délais de livraison sont donnés à titre indicatif. Jatek s'efforce de respecter les délais annoncés mais ne saurait être tenu responsable des retards liés à des événements extérieurs.

**Article 5 — Responsabilité**
Jatek agit en tant qu'intermédiaire entre les commerçants et les clients. La responsabilité de la qualité des produits incombe aux commerçants.

**Article 6 — Modification des CGU**
Jatek se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par notification ou email.`,
  },
  {
    id: "privacy",
    title: "Politique de confidentialité (RGPD)",
    content: `**Responsable du traitement**
Jatek SAS — contact : privacy@tawsila.ma

**Données collectées**
- Données d'identification : nom, email, numéro de téléphone
- Données de localisation : adresse de livraison, position GPS (avec votre consentement)
- Données de commande : historique, préférences alimentaires
- Données de navigation : cookies techniques et analytiques

**Finalités du traitement**
- Exécution des commandes et suivi de livraison
- Gestion du compte utilisateur
- Envoi de communications marketing (avec votre consentement)
- Amélioration du service et analyses statistiques

**Base légale**
- Exécution du contrat (commandes)
- Consentement (marketing, géolocalisation)
- Intérêt légitime (sécurité, fraude)

**Durée de conservation**
Les données sont conservées pendant 3 ans après le dernier achat ou la fermeture du compte.

**Vos droits**
Conformément au RGPD, vous disposez des droits d'accès, rectification, effacement, portabilité et opposition. Pour exercer ces droits : privacy@tawsila.ma

**Cookies**
Nous utilisons des cookies techniques (nécessaires) et analytiques (avec consentement). Vous pouvez gérer vos préférences depuis votre navigateur.`,
  },
  {
    id: "sms",
    title: "Politique de communications marketing",
    content: `**SMS & Notifications push**
Avec votre consentement, Jatek peut vous envoyer des SMS et notifications push concernant :
- Les promotions et offres spéciales
- Les nouveaux restaurants disponibles dans votre zone
- Le statut de vos commandes (non optionnel)
- Les mises à jour de l'application

Vous pouvez retirer votre consentement à tout moment depuis votre profil ou en répondant STOP à tout SMS marketing.

**Email marketing**
Avec votre consentement, vous pouvez recevoir notre newsletter hebdomadaire. Chaque email contient un lien de désinscription.

**Fréquence**
Jatek s'engage à ne pas envoyer plus de 3 communications marketing par semaine.`,
  },
  {
    id: "delete",
    title: "Suppression de compte",
    content: `**Suppression définitive du compte**
Vous pouvez demander la suppression définitive de votre compte à tout moment depuis :
- L'application mobile : Profil → Paramètres → Supprimer mon compte
- Par email à : support@tawsila.ma

La suppression est irréversible. Vos données personnelles seront effacées dans un délai de 30 jours, conformément au RGPD. Certaines données peuvent être conservées plus longtemps pour des obligations légales (données comptables, litiges).

Vos commandes passées resteront dans les archives de Jatek de manière anonymisée à des fins statistiques.`,
  },
  {
    id: "contact",
    title: "Contact & réclamations",
    content: `**Service client**
Email : support@tawsila.ma
Téléphone : +212 600 000 000
Disponible du lundi au vendredi de 9h à 20h, et le week-end de 10h à 18h.

**Réclamations**
En cas de problème avec votre commande, contactez-nous dans les 24 heures suivant la livraison. Nous nous engageons à répondre dans un délai de 48 heures ouvrées.

**Médiateur**
En cas de litige non résolu, vous pouvez recourir au médiateur de la consommation : mediateur@consommation.fr`,
  },
];

function Section({ section }: { section: typeof sections[0] }) {
  const [open, setOpen] = useState(false);

  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold text-foreground mt-4 mb-1 first:mt-0">{line.replace(/\*\*/g, "")}</p>;
      }
      if (line.startsWith("- ")) {
        return <li key={i} className="text-sm text-muted-foreground ml-3">{line.slice(2)}</li>;
      }
      if (!line.trim()) return null;
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <span className="font-semibold text-sm text-foreground">{section.title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border space-y-1 pt-3">
          {renderContent(section.content)}
        </div>
      )}
    </div>
  );
}

export default function LegalPage() {
  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl">Informations légales</h1>
        <p className="text-muted-foreground text-sm mt-1">Mentions légales, CGU, confidentialité et vos droits</p>
      </div>

      <div className="space-y-2">
        {sections.map((s) => (
          <Section key={s.id} section={s} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Dernière mise à jour : avril 2026 · Jatek SAS
      </p>
    </div>
  );
}
