import { getTaskCategoryIds } from "@/lib/task-category-ids";

describe("lib/task-category-ids", () => {
  it("returns draft_category_ids when no sell product is linked", () => {
    expect(
      getTaskCategoryIds({
        draft_category_ids: [149, 152],
      }),
    ).toEqual([149, 152]);
  });

  it("merges sell product category with draft categories", () => {
    expect(
      getTaskCategoryIds({
        sellProduct: { category_id: 150 },
        draft_category_ids: [152],
      }),
    ).toEqual([150, 152]);
  });

  it("deduplicates category ids", () => {
    expect(
      getTaskCategoryIds({
        sellProduct: { category_id: 151 },
        draft_category_ids: [151, 153],
      }),
    ).toEqual([151, 153]);
  });

  it("returns empty array for null task", () => {
    expect(getTaskCategoryIds(null)).toEqual([]);
  });
});
