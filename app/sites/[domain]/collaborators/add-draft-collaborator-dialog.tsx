"use client";

import {
    useCallback,
    useMemo,
    useState,
    type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    UserPlus,
    Loader2,
    Upload,
    X,
} from "lucide-react";

import { createDraftCollaborator } from "./actions";

interface AddDraftCollaboratorDialogProps {
    siteId: string;
    domain: string;
}

const AVATAR_PALETTE = [
    "#6366f1",
    "#8b5cf6",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
] as const;

const computeInitials = (given: string, family: string): string => {
    const a = given.trim().charAt(0);
    const b = family.trim().charAt(0);
    return `${a}${b}`.toUpperCase();
};

const pickColorFromName = (seed: string): string => {
    if (!seed) return AVATAR_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const draftSchema = z.object({
    email: z
        .string({ required_error: "Email obbligatoria" })
        .trim()
        .min(1, "Email obbligatoria")
        .email("Email non valida"),
    given_name: z
        .string({ required_error: "Nome obbligatorio" })
        .trim()
        .min(1, "Nome obbligatorio")
        .max(60, "Massimo 60 caratteri"),
    family_name: z
        .string({ required_error: "Cognome obbligatorio" })
        .trim()
        .min(1, "Cognome obbligatorio")
        .max(60, "Massimo 60 caratteri"),
    company_role: z.string().trim().max(80, "Massimo 80 caratteri").optional(),
    initials: z
        .string()
        .trim()
        .max(3, "Massimo 3 caratteri")
        .optional(),
    color: z.string().trim().optional(),
});

type DraftFormValues = z.infer<typeof draftSchema>;

export function AddDraftCollaboratorDialog({
    siteId,
    domain,
}: AddDraftCollaboratorDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [pictureFile, setPictureFile] = useState<File | null>(null);
    const [picturePreview, setPicturePreview] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const form = useForm<DraftFormValues>({
        resolver: zodResolver(draftSchema),
        mode: "onBlur",
        defaultValues: {
            email: "",
            given_name: "",
            family_name: "",
            company_role: "",
            initials: "",
            color: "",
        },
    });

    const givenName = form.watch("given_name");
    const familyName = form.watch("family_name");
    const customInitials = form.watch("initials");
    const selectedColor = form.watch("color");

    const computedInitials = useMemo(
        () =>
            customInitials && customInitials.trim().length > 0
                ? customInitials.trim().toUpperCase()
                : computeInitials(givenName || "", familyName || ""),
        [customInitials, givenName, familyName],
    );

    const effectiveColor = useMemo(
        () =>
            selectedColor && selectedColor.length > 0
                ? selectedColor
                : pickColorFromName(`${givenName} ${familyName}`),
        [selectedColor, givenName, familyName],
    );

    const resetAll = useCallback(() => {
        form.reset();
        setPictureFile(null);
        setPicturePreview(null);
    }, [form]);

    const handlePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast({
                title: "Formato non valido",
                description: "Seleziona un'immagine valida.",
                variant: "destructive",
            });
            return;
        }
        setPictureFile(file);
        setPicturePreview(URL.createObjectURL(file));
    };

    const uploadProfilePicture = async (userId: string) => {
        if (!pictureFile) return true;
        const formData = new FormData();
        formData.append("picture", pictureFile);
        const response = await fetch(`/api/users/${userId}/picture`, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data?.error || "Errore upload immagine");
        }
        return true;
    };

    const handleCreate = async (values: DraftFormValues) => {
        setIsCreating(true);
        try {
            const initialsToSave = (values.initials &&
                    values.initials.trim().length > 0)
                ? values.initials.trim().toUpperCase()
                : computedInitials || null;
            const colorToSave = values.color && values.color.length > 0
                ? values.color
                : effectiveColor;

            const result = await createDraftCollaborator(
                siteId,
                values.email.trim(),
                values.given_name.trim(),
                values.family_name.trim(),
                values.company_role?.trim() || null,
                initialsToSave,
                colorToSave,
                domain,
            );

            if (result.success) {
                if ("userId" in result && result.userId && pictureFile) {
                    try {
                        await uploadProfilePicture(result.userId);
                    } catch (err) {
                        toast({
                            title: "Foto non caricata",
                            description: err instanceof Error
                                ? err.message
                                : "Errore upload immagine",
                            variant: "destructive",
                        });
                    }
                }
                toast({
                    title: "Bozza creata",
                    description: result.message,
                });
                setIsOpen(false);
                resetAll();
                router.refresh();
            } else {
                toast({
                    title: "Errore",
                    description:
                        ("error" in result && result.error)
                            ? result.error
                            : "Si è verificato un errore durante la creazione.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Errore",
                description: "Si è verificato un errore",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(next) => {
                setIsOpen(next);
                if (!next) resetAll();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Crea collaboratore (bozza)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle>Crea collaboratore (bozza)</DialogTitle>
                    <DialogDescription>
                        Crea un collaboratore senza inviare email. Potrai
                        configurare permessi e dati prima di attivarlo con
                        password.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleCreate)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email *</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="email@esempio.com"
                                            autoComplete="off"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="given_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Nome"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="family_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cognome *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Cognome"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Accordion
                            type="single"
                            collapsible
                            className="rounded-md border border-border px-3"
                        >
                            <AccordionItem
                                value="optional"
                                className="border-b-0"
                            >
                                <AccordionTrigger className="text-sm">
                                    Dettagli aggiuntivi (opzionale)
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <div className="flex items-center gap-4 rounded-md border border-border bg-muted/40 p-3">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage
                                                src={picturePreview ||
                                                    undefined}
                                            />
                                            <AvatarFallback
                                                className="text-primary-foreground font-semibold"
                                                style={{
                                                    backgroundColor:
                                                        effectiveColor,
                                                }}
                                            >
                                                {computedInitials || "CL"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-wrap gap-2">
                                            <Label
                                                htmlFor="draftProfilePicture"
                                                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <Upload className="h-4 w-4" />
                                                Carica foto profilo
                                            </Label>
                                            <input
                                                id="draftProfilePicture"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePictureChange}
                                            />
                                            {picturePreview && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setPictureFile(null);
                                                        setPicturePreview(null);
                                                    }}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Rimuovi foto
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="company_role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Ruolo in azienda
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="es. Tecnico, Produzione, Amministrazione..."
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="initials"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Iniziali
                                                    (auto-calcolate)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        maxLength={3}
                                                        placeholder={computedInitials ||
                                                            "CL"}
                                                        {...field}
                                                        value={field.value ||
                                                            ""}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value
                                                                    .toUpperCase(),
                                                            )}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="color"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Colore avatar
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="flex flex-wrap gap-2">
                                                        {AVATAR_PALETTE.map(
                                                            (color) => (
                                                                <button
                                                                    key={color}
                                                                    type="button"
                                                                    aria-label={`Colore ${color}`}
                                                                    className={cn(
                                                                        "h-8 w-8 rounded-full border-2 transition-all",
                                                                        effectiveColor ===
                                                                                color
                                                                            ? "border-foreground scale-110"
                                                                            : "border-transparent hover:scale-105",
                                                                    )}
                                                                    style={{
                                                                        backgroundColor:
                                                                            color,
                                                                    }}
                                                                    onClick={() =>
                                                                        field
                                                                            .onChange(
                                                                                color,
                                                                            )}
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={isCreating}
                            >
                                Annulla
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating
                                    ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Creazione...
                                        </>
                                    )
                                    : (
                                        "Crea bozza"
                                    )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
