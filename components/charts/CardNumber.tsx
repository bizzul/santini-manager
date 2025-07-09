import {
  IconDefinition,
  IconName,
  IconPrefix,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from "@fortawesome/react-fontawesome";

interface CardNumber {
  title: string;
  grow: string;
  icon: IconDefinition;
  number: number;
}

function CardNumber({ title, grow, icon, number }: CardNumber) {
  return (
    <div className="flex flex-col p-4 shadow-md shadow-slate-800/50 bg-slate-100">
      <div className="flex flex-row justify-between">
        <h1 className="text-md font-bold">{title}</h1>
        <p className="text-green-500 text-xl">{grow}</p>
      </div>
      <div className="flex flex-row justify-between pt-4">
        <FontAwesomeIcon icon={icon} className="text-6xl text-green-600/50" />
        <p className="text-6xl text-slate-500">{number}</p>
      </div>
    </div>
  );
}

export default CardNumber;
