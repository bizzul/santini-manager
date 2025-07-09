import { FC } from "react";
import { ClientAddressType } from "./client-type-definitions";
import { ClientAddressesEditForm } from "./edit-addresses-form";
type Props = {
  type: ClientAddressType;
  showSameAsMainOption?: Boolean;
  loading: boolean;
  preloadedValues: any;
};
/**
 * Client Editor Form
 * All the hooks related to CRUD operations are inside this component.
 * @returns
 */
export const ClientAddressesEdit: FC<Props> = ({
  type,
  showSameAsMainOption = false,
  loading,
  preloadedValues,
}) => {
  return (
    <>
      {preloadedValues ? (
        <ClientAddressesEditForm
          preloadedValues={preloadedValues}
          type={type}
          showSameAsMainOption={showSameAsMainOption}
        />
      ) : (
        <div>Loading...</div>
      )}
    </>
  );
};
