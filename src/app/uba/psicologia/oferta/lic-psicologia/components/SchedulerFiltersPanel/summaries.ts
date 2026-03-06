export const collapsedMateriaSummary = (selectedSubjectLabel: string) =>
  selectedSubjectLabel.match(/Cátedra\s+\d+/i)?.[0] || selectedSubjectLabel;

export const collapsedComisionesSummary = (
  selectedComisionesLength: number,
  filteredComisionesLength: number
) =>
  selectedComisionesLength === filteredComisionesLength
    ? 'todas'
    : `${selectedComisionesLength}/${filteredComisionesLength}`;
