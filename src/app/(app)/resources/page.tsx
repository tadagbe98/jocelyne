import { PageHeader } from "@/components/page-header";
import { mockResources } from "@/lib/mock-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Resource } from "@/lib/types";

export default function ResourcesPage() {
    const resourcesByCategory = mockResources.reduce((acc, resource) => {
        const { category } = resource;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(resource);
        return acc;
    }, {} as Record<string, Resource[]>);

    return (
        <>
            <PageHeader 
                title="Ressources Pratiques"
                description="Guides, conseils et bonnes pratiques pour vous aider à réussir."
            />
            
            <Accordion type="multiple" defaultValue={Object.keys(resourcesByCategory)} className="w-full space-y-6">
                {Object.entries(resourcesByCategory).map(([category, resources]) => (
                    <AccordionItem value={category} key={category} className="border-none">
                        <AccordionTrigger className="text-2xl font-bold font-headline py-2 hover:no-underline text-left">
                           {category}
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="grid gap-6 pt-4 md:grid-cols-2 lg:grid-cols-3">
                                {resources.map(resource => {
                                    const placeholder = PlaceHolderImages.find(p => p.id === resource.image);
                                    return (
                                        <Card key={resource.id} className="overflow-hidden flex flex-col">
                                            {placeholder && (
                                                <div className="relative w-full h-48">
                                                    <Image 
                                                        src={placeholder.imageUrl} 
                                                        alt={resource.title} 
                                                        fill
                                                        style={{ objectFit: 'cover' }}
                                                        data-ai-hint={placeholder.imageHint}
                                                    />
                                                </div>
                                            )}
                                            <CardHeader>
                                                <CardTitle>{resource.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <p className="text-muted-foreground">{resource.content}</p>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </>
    );
}
