
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { AutoAwesome, Logout } from "@mui/icons-material";

import authService from "../services/authService";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    authService.getCurrentUser()
      .then((data) => {
        if (active) setUser(data);
      })
      .catch(() => {
        authService.logout();
        navigate("/login", { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      <Box
        sx={{
          backgroundColor: "white",
          borderBottom: "1px solid #E2E8F0",
          px: 4,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesome color="primary" />
          <Typography variant="h6" fontWeight={700}>KnowHub AI</Typography>
        </Box>

        <Button startIcon={<Logout />} onClick={handleLogout}>
          Logout
        </Button>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Authentication successful. You are securely logged in.
        </Alert>

        <Typography variant="h4" sx={{ mb: 1 }}>
          Welcome to KnowHub AI
        </Typography>

        <Typography color="text.secondary">
          Hello, {user.username}
        </Typography>

        <Box
          sx={{
            mt: 4,
            p: 3,
            backgroundColor: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>Account details</Typography>
          <Typography><b>Username:</b> {user.username}</Typography>
          <Typography><b>Email:</b> {user.email}</Typography>
          <Typography><b>User ID:</b> {user.id}</Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default Dashboard;