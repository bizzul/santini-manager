import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { FC } from "react";
import ReactPaginate from "react-paginate";
import { cn } from "@/lib/utils";

type Props = {
  handlePageClick: (event: { selected: number }) => void;
  data: { pagination?: { total_pages?: number } } | null;
  page: number;
  className?: string;
  size?: string;
};

const sizeClasses = {
  md: "text-sm p-1",
  sm: "text-xs p-1",
};

/**
 * @deprecated Use `@/components/table/pagination` with TanStack tables in new code.
 */
export const Pagination: FC<Props> = ({
  handlePageClick,
  data,
  className,
  size = "md",
  page = 1,
}) => {
  const itemClass = size === "sm" ? sizeClasses.sm : sizeClasses.md;

  return (
    <div className={className}>
      <ReactPaginate
        breakLabel={<MoreHorizontal className="h-4 w-4" />}
        onPageChange={handlePageClick}
        pageRangeDisplayed={5}
        pageCount={data?.pagination?.total_pages ?? 0}
        previousLabel={<ChevronLeft className="h-4 w-4" />}
        nextLabel={<ChevronRight className="h-4 w-4" />}
        className={cn(
          "flex justify-end text-foreground antialiased",
          itemClass.split(" ")[0]
        )}
        activeClassName="bg-primary text-primary-foreground rounded-md"
        previousClassName={cn(
          "rounded-l-md border border-border bg-card",
          itemClass
        )}
        nextClassName={cn(
          "rounded-r-md border border-border bg-card",
          itemClass
        )}
        pageClassName={cn(
          "border border-l-0 border-border bg-card",
          itemClass
        )}
        breakClassName={cn("border border-border bg-card", itemClass)}
        forcePage={page - 1}
      />
    </div>
  );
};
