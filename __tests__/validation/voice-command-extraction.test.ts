import { VoiceCommandExtractionSchema } from "@/validation/voice-input/command";

// Output grezzo di claude-sonnet-4-6 (tool "json") sul transcript
// "Crea offerta per cliente Stefano Bernasconi per la fornitura di una
// finestra in legno. Prezzo 1000 franchi." L'oggetto valido e' annidato
// sotto una chiave `data` in piu'.
const ANTHROPIC_WRAPPED_OFFER = {
    data: {
        intent: "create_offer",
        summary:
            "Crea offerta per Stefano Bernasconi per fornitura finestra in legno a 1000 franchi.",
        needsClarification: false,
        data: {
            clientName: "Stefano Bernasconi",
            title: "Fornitura finestra in legno",
            productName: null,
            productCategory: null,
            productType: null,
            location: null,
            kanbanName: null,
            taskCode: null,
            cardTitle: null,
            targetColumnName: null,
            notes: "Fornitura di una finestra in legno",
            deliveryDate: null,
            startTime: null,
            endTime: null,
            priceList: null,
            team: null,
            roleName: null,
            internalActivity: null,
            address: null,
            city: null,
            countryCode: null,
            email: null,
            phone: null,
            clientType: null,
            activityType: null,
            lossReason: null,
            tipoDocumento: null,
            oggetto: null,
            testoDocumento: null,
            destinatarioTipo: null,
            sellPrice: 1000,
            pieces: null,
            zipCode: null,
            hours: null,
            minutes: null,
        },
    },
};

describe("VoiceCommandExtractionSchema", () => {
    it("accetta l'involucro data extra restituito da Anthropic", () => {
        const parsed = VoiceCommandExtractionSchema.parse(ANTHROPIC_WRAPPED_OFFER);

        expect(parsed.intent).toBe("create_offer");
        expect(parsed.needsClarification).toBe(false);
        expect(parsed.data.clientName).toBe("Stefano Bernasconi");
        expect(parsed.data.title).toBe("Fornitura finestra in legno");
        expect(parsed.data.sellPrice).toBe(1000);
        expect(parsed.data.notes).toBe("Fornitura di una finestra in legno");
    });

    it("lascia invariato un oggetto gia' corretto", () => {
        const parsed = VoiceCommandExtractionSchema.parse({
            intent: "create_client",
            summary: "Nuovo cliente Bianchi",
            needsClarification: false,
            data: {
                clientName: "Bianchi SA",
                address: "via Roma 1",
                city: "Lugano",
                zipCode: 6900,
                countryCode: "CH",
            },
        });

        expect(parsed.intent).toBe("create_client");
        expect(parsed.data.clientName).toBe("Bianchi SA");
        expect(parsed.data.zipCode).toBe(6900);
    });

    it("converte un prezzo con valuta svizzera anche dentro l'involucro", () => {
        const parsed = VoiceCommandExtractionSchema.parse({
            data: {
                intent: "create_project",
                summary: "Progetto per Mario Rossi",
                needsClarification: false,
                data: {
                    clientName: "Mario Rossi",
                    sellPrice: "CHF 1'500.-",
                },
            },
        });

        expect(parsed.intent).toBe("create_project");
        expect(parsed.data.clientName).toBe("Mario Rossi");
        expect(parsed.data.sellPrice).toBe(1500);
    });

    it("interpreta il punto come migliaia quando non ci sono decimali", () => {
        const parsed = VoiceCommandExtractionSchema.parse({
            intent: "create_offer",
            summary: "Offerta da 4500 franchi",
            needsClarification: false,
            data: { sellPrice: "4.500" },
        });

        expect(parsed.data.sellPrice).toBe(4500);
    });
});
