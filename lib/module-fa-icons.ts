/**
 * Shared FontAwesome icon map for module cards/nodes (home standard view,
 * WBS diagram). Keys match `ModuleConfig.icon` names used in the sidebar.
 */
import {
    faBox,
    faCalendarCheck,
    faCalendarDays,
    faCheckSquare,
    faClock,
    faExclamation,
    faHelmetSafety,
    faIndustry,
    faListUl,
    faMicrophone,
    faSquarePollVertical,
    faTable,
    faUser,
    faUserTie,
    faWarehouse,
    faWaveSquare,
    type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

export const MODULE_FA_ICONS: Record<string, IconDefinition> = {
    faWaveSquare,
    faTable,
    faClock,
    faUser,
    faExclamation,
    faSquarePollVertical,
    faCheckSquare,
    faBox,
    faHelmetSafety,
    faUserTie,
    faWarehouse,
    faCalendarDays,
    faCalendarCheck,
    faIndustry,
    faListUl,
    faMicrophone,
};

export function getModuleFaIcon(name?: string): IconDefinition | undefined {
    if (!name) return undefined;
    return MODULE_FA_ICONS[name];
}
