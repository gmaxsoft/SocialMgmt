import { Paper, Typography } from "@mui/material";

export function DashboardPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary">Przegląd KPI i skróty — do rozbudowy w kolejnych fazach.</Typography>
    </Paper>
  );
}
