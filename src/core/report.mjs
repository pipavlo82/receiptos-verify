export function textReport(report) {
  return [`ReceiptOS Verify — ${report.overall}`,`Projection: ${report.projection_version}`,report.explanation,'',...Object.entries(report.layers).map(([name,r])=>`${name}: ${r.status}${r.reasonCodes?.length?' ['+r.reasonCodes.join(', ')+']':''}`),'',...report.boundaries].join('\n')+'\n';
}
