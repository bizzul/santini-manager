interface ProjectLabelClient {
  businessName?: string | null;
  individualFirstName?: string | null;
  individualLastName?: string | null;
}

interface ProjectLabelTask {
  unique_code?: string | null;
  title?: string | null;
  name?: string | null;
  client?: ProjectLabelClient | null;
  Client?: ProjectLabelClient | null;
}

const normalizeString = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const getProjectClientName = (
  task: ProjectLabelTask
): string | null => {
  const client = task.Client ?? task.client;

  if (!client) {
    return null;
  }

  const businessName = normalizeString(client.businessName);
  if (businessName) {
    return businessName;
  }

  const contactName = [
    normalizeString(client.individualFirstName),
    normalizeString(client.individualLastName),
  ]
    .filter(Boolean)
    .join(" ");

  return contactName || null;
};

export const getProjectObjectName = (
  task: ProjectLabelTask
): string | null =>
  normalizeString(task.title) ?? normalizeString(task.name);

export const getProjectLabel = (task: ProjectLabelTask): string => {
  const projectCode = normalizeString(task.unique_code);
  const clientName = getProjectClientName(task);
  const objectName = getProjectObjectName(task);

  return [projectCode, clientName, objectName].filter(Boolean).join(" - ");
};
