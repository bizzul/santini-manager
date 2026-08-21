import {
  formatSiteAddress,
  getClientSiteAddress,
  isEquivalentSiteAddress,
  splitSiteAddress,
} from "@/lib/site-address";

describe("site-address", () => {
  it("formats street and town", () => {
    expect(formatSiteAddress("Strada di San Fedele 3", "Roveredo")).toBe(
      "Strada di San Fedele 3, Roveredo",
    );
  });

  it("splits a stored address and swaps town-first values", () => {
    expect(splitSiteAddress("Roveredo, Strada di San Fedele 3")).toEqual({
      street: "Strada di San Fedele 3",
      town: "Roveredo",
    });
  });

  it("uses the client street and town for the cantiere defaults", () => {
    expect(
      getClientSiteAddress({
        address: "Strada di San Fedele 3",
        city: "Roveredo",
      }),
    ).toEqual({
      street: "Strada di San Fedele 3",
      town: "Roveredo",
    });
  });

  it("treats swapped street/town as the same site address", () => {
    expect(
      isEquivalentSiteAddress(
        { street: "Roveredo", town: "Strada di San Fedele 3" },
        { street: "Strada di San Fedele 3", town: "Roveredo" },
      ),
    ).toBe(true);
  });
});
