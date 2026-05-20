"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Plus,
    Loader2,
    Upload,
    X,
    Users,
    UserPlus,
    Check,
} from "lucide-react";

import {
    addCollaboratorToSite,
    getAvailableUsersForSite,
    inviteNewCollaborator,
} from "./actions";

interface AddCollaboratorDialogProps {
    siteId: string;
    domain: string;
}

interface AvailableUser {
    id: number;
    authId: string | null;
    email: string;
    given_name: string | null;
    family_name: string | null;
    role: string | null;
    company_role: string | null;
    enabled: boolean | null;
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

const inviteSchema = z.object({
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

type InviteFormValues = z.infer<typeof inviteSchema>;

export function AddCollaboratorDialog(
    { siteId, domain }: AddCollaboratorDialogProps,
) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"existing" | "invite">(
        "existing",
    );

    // Stato — tab "Membro esistente"
    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
    const [isLoadingExisting, setIsLoadingExisting] = useState(false);
    const [selectedExistingId, setSelectedExistingId] = useState<string | null>(
        null,
    );
    const [isAddingExisting, setIsAddingExisting] = useState(false);

    // Stato — tab "Nuovo invito"
    const [pictureFile, setPictureFile] = useState<File | null>(null);
    const [picturePreview, setPicturePreview] = useState<string | null>(null);
    const [isInviting, setIsInviting] = useState(false);

    const form = useForm<InviteFormValues>({
        resolver: zodResolver(inviteSchema),
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

    const fetchAvailable = useCallback(async () => {
        setIsLoadingExisting(true);
        try {
            const result = await getAvailableUsersForSite(siteId);
            if (result.success) {
                setAvailableUsers((result.users as AvailableUser[]) || []);
            } else {
                setAvailableUsers([]);
            }
        } catch {
            setAvailableUsers([]);
        } finally {
            setIsLoadingExisting(false);
        }
    }, [siteId]);

    useEffect(() => {
        if (!isOpen) return;
        fetchAvailable();
    }, [isOpen, fetchAvailable]);

    useEffect(() => {
        if (!isOpen) return;
        // Se non ci sono utenti disponibili nell'organizzazione, parti dal tab invito
        if (!isLoadingExisting && availableUsers.length === 0) {
            setActiveTab("invite");
        }
    }, [isOpen, isLoadingExisting, availableUsers.length]);

    const resetAll = useCallback(() => {
        form.reset();
        setPictureFile(null);
        setPicturePreview(null);
        setSelectedExistingId(null);
        setActiveTab("existing");
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

    const handleAddExisting = async () => {
        if (!selectedExistingId) return;
        setIsAddingExisting(true);
        try {
            const result = await addCollaboratorToSite(
                siteId,
                selectedExistingId,
                domain,
            );
            if (result.success) {
                toast({
                    title: "Collaboratore aggiunto",
                    description: result.message,
                });
                setIsOpen(false);
                resetAll();
            } else {
                toast({
                    title: "Errore",
                    description: result.error,
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
            setIsAddingExisting(false);
        }
    };

    const handleInvite = async (values: InviteFormValues) => {
        setIsInviting(true);
        try {
            const initialsToSave = (values.initials &&
                    values.initials.trim().length > 0)
                ? values.initials.trim().toUpperCase()
                : computedInitials || null;
            const colorToSave = values.color && values.color.length > 0
                ? values.color
                : effectiveColor;

            const result = await inviteNewCollaborator(
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
                    title: "Invito inviato",
                    description: result.message,
                });
                setIsOpen(false);
                resetAll();
            } else {
                toast({
                    title: "Errore",
                    description:
                        ("error" in result && result.error)
                            ? result.error
                            : "Si è verificato un errore durante l'invito.",
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
            setIsInviting(false);
        }
    };

    const isExistingTabUsable = availableUsers.length > 0 ||
        isLoadingExisting;

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(next) => {
                setIsOpen(next);
                if (!next) resetAll();
            }}
        >
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Aggiungi Collaboratore
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle>Aggiungi Collaboratore</DialogTitle>
                    <DialogDescription>
                        Aggiungi un membro già presente nell&apos;organizzazione
                        oppure invita un nuovo collaboratore via email.
                    </DialogDescription>
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(value as "existing" | "invite")}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                            value="existing"
                            className="gap-2"
                            disabled={!isExistingTabUsable &&
                                !isLoadingExisting}
                        >
                            <Users className="h-4 w-4" />
                            Membro esistente
                        </TabsTrigger>
                        <TabsTrigger value="invite" className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Nuovo invito
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="pt-2">
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Seleziona un utente della tua organizzazione
                                non ancora collegato a questo sito.
                            </p>

                            <Command
                                className="rounded-md border border-border"
                                filter={(value, search) => {
                                    if (!search) return 1;
                                    return value
                                            .toLowerCase()
                                            .includes(search.toLowerCase())
                                        ? 1
                                        : 0;
                                }}
                            >
                                <CommandInput placeholder="Cerca per nome o email..." />
                                <CommandList>
                                    {isLoadingExisting
                                        ? (
                                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Caricamento utenti...
                                            </div>
                                        )
                                        : (
                                            <>
                                                <CommandEmpty>
                                                    Nessun utente disponibile
                                                    nell&apos;organizzazione.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {availableUsers.map(
                                                        (user) => {
                                                            const fullName =
                                                                [
                                                                    user
                                                                        .given_name,
                                                                    user
                                                                        .family_name,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(" ") ||
                                                                user.email;
                                                            const isSelected =
                                                                selectedExistingId ===
                                                                    user.authId;
                                                            return (
                                                                <CommandItem
                                                                    key={user
                                                                        .id}
                                                                    value={`${fullName} ${user.email}`}
                                                                    onSelect={() =>
                                                                        setSelectedExistingId(
                                                                            user
                                                                                .authId,
                                                                        )}
                                                                    className="flex items-center gap-3"
                                                                >
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarFallback
                                                                            style={{
                                                                                backgroundColor:
                                                                                    pickColorFromName(
                                                                                        fullName,
                                                                                    ),
                                                                            }}
                                                                            className="text-xs text-primary-foreground font-medium"
                                                                        >
                                                                            {computeInitials(
                                                                                user
                                                                                    .given_name ||
                                                                                    "",
                                                                                user
                                                                                    .family_name ||
                                                                                    "",
                                                                            ) ||
                                                                                "?"}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex min-w-0 flex-1 flex-col">
                                                                        <span className="truncate font-medium">
                                                                            {fullName}
                                                                        </span>
                                                                        <span className="truncate text-xs text-muted-foreground">
                                                                            {user
                                                                                .email}
                                                                            {user.company_role
                                                                                ? ` · ${user.company_role}`
                                                                                : ""}
                                                                        </span>
                                                                    </div>
                                                                    {isSelected &&
                                                                        (
                                                                            <Check className="h-4 w-4 text-primary" />
                                                                        )}
                                                                </CommandItem>
                                                            );
                                                        },
                                                    )}
                                                </CommandGroup>
                                            </>
                                        )}
                                </CommandList>
                            </Command>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={isAddingExisting}
                            >
                                Annulla
                            </Button>
                            <Button
                                onClick={handleAddExisting}
                                disabled={!selectedExistingId ||
                                    isAddingExisting}
                            >
                                {isAddingExisting
                                    ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Aggiunta...
                                        </>
                                    )
                                    : (
                                        "Aggiungi al sito"
                                    )}
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="invite" className="pt-2">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(handleInvite)}
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
                                                        {computedInitials ||
                                                            "CL"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-wrap gap-2">
                                                    <Label
                                                        htmlFor="newProfilePicture"
                                                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                        Carica foto profilo
                                                    </Label>
                                                    <input
                                                        id="newProfilePicture"
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
                                                                setPictureFile(
                                                                    null,
                                                                );
                                                                setPicturePreview(
                                                                    null,
                                                                );
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
                                                                value={field
                                                                    .value || ""}
                                                                onChange={(e) =>
                                                                    field
                                                                        .onChange(
                                                                            e
                                                                                .target
                                                                                .value
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
                                                                {AVATAR_PALETTE
                                                                    .map(
                                                                        (
                                                                            color,
                                                                        ) => (
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
                                        disabled={isInviting}
                                    >
                                        Annulla
                                    </Button>
                                    <Button type="submit" disabled={isInviting}>
                                        {isInviting
                                            ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Invio...
                                                </>
                                            )
                                            : (
                                                "Invia invito"
                                            )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
