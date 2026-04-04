"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Cog,
  Factory,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

type FactoryMachine = {
  id: string;
  name: string;
  description: string;
  hourlyCost: string;
  imageUrl: string | null;
};

type FactoryDepartment = {
  id: string;
  name: string;
  description: string;
  machines: FactoryMachine[];
};

type FactorySettings = {
  departments: FactoryDepartment[];
};

interface FactorySettingsModalProps {
  siteId: string;
  trigger: React.ReactNode;
}

const emptyDepartment = (): FactoryDepartment => ({
  id: "",
  name: "",
  description: "",
  machines: [],
});

const emptyMachine = (): FactoryMachine => ({
  id: "",
  name: "",
  description: "",
  hourlyCost: "",
  imageUrl: null,
});

const createId = () => Math.random().toString(36).slice(2, 10);

export default function FactorySettingsModal({
  siteId,
  trigger,
}: FactorySettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FactorySettings>({ departments: [] });
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [departmentForm, setDepartmentForm] =
    useState<FactoryDepartment>(emptyDepartment);
  const [machineForm, setMachineForm] = useState<FactoryMachine>(emptyMachine);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(
    null
  );
  const [machineDepartmentId, setMachineDepartmentId] = useState<string | null>(
    null
  );
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadSettings();
  }, [open, siteId]);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/settings/site-config?siteId=${siteId}&settingKey=factory_settings`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Impossibile caricare la configurazione");
      }

      setSettings({
        departments: Array.isArray(result.value?.departments)
          ? result.value.departments
          : [],
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore nel caricamento"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          settingKey: "factory_settings",
          value: settings,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile salvare la configurazione");
      }
      toast.success("Impostazioni fabbrica salvate");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  function openDepartmentDialog(department?: FactoryDepartment) {
    setEditingDepartmentId(department?.id || null);
    setDepartmentForm(department || emptyDepartment());
    setDepartmentDialogOpen(true);
  }

  function saveDepartment() {
    if (!departmentForm.name.trim()) {
      toast.error("Il nome reparto è obbligatorio");
      return;
    }

    const payload: FactoryDepartment = {
      ...departmentForm,
      id: departmentForm.id || createId(),
      name: departmentForm.name.trim(),
      description: departmentForm.description.trim(),
      machines: departmentForm.machines || [],
    };

    setSettings((current) => ({
      departments: editingDepartmentId
        ? current.departments.map((department) =>
            department.id === editingDepartmentId ? payload : department
          )
        : [...current.departments, payload],
    }));
    setDepartmentDialogOpen(false);
  }

  function deleteDepartment(departmentId: string) {
    setSettings((current) => ({
      departments: current.departments.filter(
        (department) => department.id !== departmentId
      ),
    }));
  }

  function openMachineDialog(
    departmentId: string,
    machine?: FactoryMachine
  ) {
    setMachineDepartmentId(departmentId);
    setEditingMachineId(machine?.id || null);
    setMachineForm(machine || emptyMachine());
    setMachineDialogOpen(true);
  }

  function saveMachine() {
    if (!machineDepartmentId) return;
    if (!machineForm.name.trim()) {
      toast.error("Il nome macchinario è obbligatorio");
      return;
    }

    const payload: FactoryMachine = {
      ...machineForm,
      id: machineForm.id || createId(),
      name: machineForm.name.trim(),
      description: machineForm.description.trim(),
      hourlyCost: machineForm.hourlyCost,
    };

    setSettings((current) => ({
      departments: current.departments.map((department) => {
        if (department.id !== machineDepartmentId) return department;

        const machines = editingMachineId
          ? department.machines.map((machine) =>
              machine.id === editingMachineId ? payload : machine
            )
          : [...department.machines, payload];

        return { ...department, machines };
      }),
    }));

    setMachineDialogOpen(false);
  }

  function deleteMachine(departmentId: string, machineId: string) {
    setSettings((current) => ({
      departments: current.departments.map((department) =>
        department.id === departmentId
          ? {
              ...department,
              machines: department.machines.filter(
                (machine) => machine.id !== machineId
              ),
            }
          : department
      ),
    }));
  }

  function handleMachineImageChange(file?: File | null) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Usa immagini fino a 1MB per i macchinari");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMachineForm((current) => ({
        ...current,
        imageUrl: typeof reader.result === "string" ? reader.result : null,
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Fabbrica</DialogTitle>
            <DialogDescription className="text-white/70">
              Configura reparti produttivi, macchinari e costo orario di
              lavorazione.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    Reparti configurati
                  </p>
                  <p className="text-xs text-white/60">
                    {settings.departments.length} reparti e{" "}
                    {settings.departments.reduce(
                      (count, department) => count + department.machines.length,
                      0
                    )}{" "}
                    macchinari
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => openDepartmentDialog()}
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi reparto
                </Button>
              </div>

              {settings.departments.length === 0 ? (
                <Card className="border-white/15 bg-white/5">
                  <CardContent className="py-12 text-center text-white/65">
                    <Factory className="mx-auto mb-4 h-10 w-10 opacity-60" />
                    <p>Nessun reparto configurato</p>
                    <p className="mt-2 text-sm">
                      Inizia creando il primo reparto della fabbrica.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {settings.departments.map((department) => (
                    <Card
                      key={department.id}
                      className="border-white/15 bg-white/5 text-white"
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {department.name}
                              </CardTitle>
                              <p className="text-sm text-white/60">
                                {department.description || "Nessuna descrizione"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openDepartmentDialog(department)}
                              className="text-white/70 hover:bg-white/10 hover:text-white"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDepartment(department.id)}
                              className="text-white/70 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className="border-white/20 text-white/75"
                          >
                            {department.machines.length} macchinari
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openMachineDialog(department.id)}
                            className="border-white/30 text-white hover:bg-white/10"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Aggiungi macchinario
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {department.machines.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/50">
                            Nessun macchinario inserito
                          </div>
                        ) : (
                          department.machines.map((machine) => (
                            <div
                              key={machine.id}
                              className="rounded-2xl border border-white/10 bg-slate-950/30 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex gap-3">
                                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                    {machine.imageUrl ? (
                                      <img
                                        src={machine.imageUrl}
                                        alt={machine.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Cog className="h-6 w-6 text-white/40" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-white">
                                      {machine.name}
                                    </p>
                                    <p className="text-sm text-white/60">
                                      {machine.description || "Nessuna descrizione"}
                                    </p>
                                    <p className="mt-2 text-xs text-emerald-300">
                                      Costo orario:{" "}
                                      {machine.hourlyCost
                                        ? `CHF ${machine.hourlyCost}/h`
                                        : "non impostato"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      openMachineDialog(department.id, machine)
                                    }
                                    className="text-white/70 hover:bg-white/10 hover:text-white"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      deleteMachine(department.id, machine.id)
                                    }
                                    className="text-white/70 hover:bg-red-500/10 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva impostazioni"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingDepartmentId ? "Modifica reparto" : "Nuovo reparto"}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Inserisci nome e descrizione del reparto produttivo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-white/80">Nome reparto</Label>
              <Input
                value={departmentForm.name}
                onChange={(event) =>
                  setDepartmentForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Descrizione</Label>
              <Textarea
                value={departmentForm.description}
                onChange={(event) =>
                  setDepartmentForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDepartmentDialogOpen(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={saveDepartment}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              Salva reparto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingMachineId ? "Modifica macchinario" : "Nuovo macchinario"}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Inserisci immagine, descrizione e costo orario del macchinario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-white/80">Immagine macchinario</Label>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-sm text-white/70 hover:bg-white/10">
                <ImagePlus className="h-5 w-5" />
                <span>Carica immagine quadrata</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(event) =>
                    handleMachineImageChange(event.target.files?.[0] || null)
                  }
                />
              </label>
              {machineForm.imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img
                    src={machineForm.imageUrl}
                    alt="Anteprima macchinario"
                    className="h-40 w-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Nome macchinario</Label>
              <Input
                value={machineForm.name}
                onChange={(event) =>
                  setMachineForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Descrizione</Label>
              <Textarea
                value={machineForm.description}
                onChange={(event) =>
                  setMachineForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Costo orario</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={machineForm.hourlyCost}
                onChange={(event) =>
                  setMachineForm((current) => ({
                    ...current,
                    hourlyCost: event.target.value,
                  }))
                }
                placeholder="es. 78"
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMachineDialogOpen(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={saveMachine}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              Salva macchinario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
