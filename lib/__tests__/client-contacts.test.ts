import { getPrimaryClientContact, isEquivalentClientContact } from "@/lib/client-contacts";

describe("getPrimaryClientContact", () => {
  it("uses the first contact person when present", () => {
    expect(
      getPrimaryClientContact({
        id: 1,
        businessName: "Santini SA",
        mobilePhone: "+41 91 000 00 00",
        contactPeople: [
          { name: "Mario Rossi", phone: "+41 79 111 22 33" },
          { name: "Altro", phone: "+41 79 000 00 00" },
        ],
      }),
    ).toEqual({
      name: "Mario Rossi",
      phone: "+41 79 111 22 33",
    });
  });

  it("falls back to the client name and phone", () => {
    expect(
      getPrimaryClientContact({
        id: 2,
        individualFirstName: "Daniele",
        individualLastName: "Raveglia",
        mobilePhone: "+41793282786",
        contactPeople: [],
      }),
    ).toEqual({
      name: "Raveglia Daniele",
      phone: "+41793282786",
    });
  });

  it("treats equivalent contacts as the same even with spacing", () => {
    expect(
      isEquivalentClientContact(
        { name: "Mario Rossi", phone: "+41 79 111 22 33" },
        { name: "mario rossi", phone: "+41791112233" },
      ),
    ).toBe(true);
  });
});
