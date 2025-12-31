import { ArrowLeft, Shield, Users, UserCheck, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PermissionsSummary = () => {
  const navigate = useNavigate();

  const roles = [
    {
      name: "Admin",
      icon: Shield,
      color: "bg-red-500/10 text-red-600 border-red-200",
      badgeColor: "bg-red-500",
      permissions: [
        "Gérer tous les utilisateurs (approuver, supprimer, assigner des rôles)",
        "Créer, modifier et supprimer des actualités",
        "Créer, modifier et supprimer des événements",
        "Créer, modifier et supprimer des sermons",
        "Créer, modifier et supprimer des méditations",
        "Gérer les liens de diffusion en direct",
        "Voir tous les dons et rapports financiers",
        "Gérer les campagnes de dons",
        "Supprimer les messages du chat",
        "Voir toutes les demandes de prière",
        "Gérer les informations de l'église",
        "Assigner/retirer tous les rôles"
      ]
    },
    {
      name: "Super Leader",
      icon: UserCheck,
      color: "bg-purple-500/10 text-purple-600 border-purple-200",
      badgeColor: "bg-purple-500",
      permissions: [
        "Créer et modifier des sermons",
        "Créer et modifier des méditations",
        "Créer et modifier des actualités",
        "Créer et modifier des événements",
        "Voir toutes les demandes de prière",
        "Voir tous les dons et rapports",
        "Gérer les leaders (assigner/retirer le rôle leader)",
        "Accéder au chat communautaire"
      ]
    },
    {
      name: "Leader",
      icon: Users,
      color: "bg-blue-500/10 text-blue-600 border-blue-200",
      badgeColor: "bg-blue-500",
      permissions: [
        "Créer et modifier des actualités",
        "Créer et modifier des événements",
        "Gérer les campagnes de dons",
        "Gérer les liens de diffusion en direct",
        "Accéder au chat communautaire"
      ]
    },
    {
      name: "Membre",
      icon: User,
      color: "bg-green-500/10 text-green-600 border-green-200",
      badgeColor: "bg-green-500",
      permissions: [
        "Voir les actualités, événements, sermons et méditations",
        "Soumettre des demandes de prière",
        "Accéder au chat communautaire (après approbation)",
        "Faire des dons",
        "S'inscrire aux événements (RSVP)",
        "Gérer son profil"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Résumé des Permissions</h1>
      </div>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <p className="text-muted-foreground text-sm mb-6">
          Voici un aperçu des permissions accordées à chaque rôle dans l'application.
        </p>

        {roles.map((role) => (
          <Card key={role.name} className={`border ${role.color}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${role.color}`}>
                  <role.icon className="h-5 w-5" />
                </div>
                <span>{role.name}</span>
                <Badge className={`${role.badgeColor} text-white ml-auto`}>
                  {role.permissions.length} permissions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {role.permissions.map((permission, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PermissionsSummary;
