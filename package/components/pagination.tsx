import {
  faChevronLeft,
  faChevronRight,
  faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import ReactPaginate from "react-paginate";

type Props = {
  handlePageClick: (event: any) => void;
  data: any;
  page: number;
  className?: string;
  size?: string;
};
const classNames = {
  md: {
    text: "text-md",
    p: "p-1",
  },
  sm: {
    text: "text-sm",
    p: "p-1",
  },
};

export const Pagination: FC<Props> = ({
  handlePageClick,
  data,
  className = "m",
  size = "md",
  page = 1,
}) => {
  return (
    <div className={className}>
      <ReactPaginate
        breakLabel={<FontAwesomeIcon icon={faEllipsis} />}
        onPageChange={handlePageClick}
        pageRangeDisplayed={5}
        pageCount={data && data.pagination?.total_pages}
        previousLabel={<FontAwesomeIcon icon={faChevronLeft} />}
        nextLabel={<FontAwesomeIcon icon={faChevronRight} />}
        className={`flex justify-end text-black antialiased ${
          size === "sm" ? classNames.sm.text : classNames.md.text
        }`}
        activeClassName="bg-primary-100 text-white"
        previousClassName={`bg-white rounded-l-md border border-slate-100 ${
          size === "sm" ? classNames.sm.p : classNames.md.p
        }`}
        nextClassName={`bg-white rounded-r-md border border-slate-100 ${
          size === "sm" ? classNames.sm.p : classNames.md.p
        }`}
        pageClassName={`bg-white border border-l-0 border-slate-100 ${
          size === "sm" ? classNames.sm.p : classNames.md.p
        }`}
        breakClassName={`bg-white border border-slate-100 ${
          size === "sm" ? classNames.sm.p : classNames.md.p
        }`}
        forcePage={page - 1}
      />
    </div>
  );
};
