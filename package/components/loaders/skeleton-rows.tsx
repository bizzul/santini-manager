import { FC } from "react"

type Props = {
    lines?: number
}


export const SkeletonRows : FC<Props> = ({lines = 3}) => {
    return(
        <div className="text-center w-full p-10">
            
            {[...Array(lines)].map((x, i) =>
                <div key={`skeleton-${i}`}className="w-9/10 m-auto h-2 bg-gray-200 mb-5 animate-pulse"/>
            )}
      </div>
    )
}