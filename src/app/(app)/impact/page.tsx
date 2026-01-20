import { ImpactForm } from "@/components/impact-form";
import { PageHeader } from "@/components/page-header";

export default function ImpactPage() {

    return (
        <>
            <PageHeader
                title="Analyse d'Impact Socio-économique"
                description="Utilisez l'IA pour identifier les indicateurs clés permettant de mesurer l'impact de vos projets."
                breadcrumbs={[{ label: "Analyse d'Impact" }]}
            />
            
            <ImpactForm />
        </>
    );
}
