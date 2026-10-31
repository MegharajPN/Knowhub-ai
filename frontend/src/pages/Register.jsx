
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { AutoAwesome, Visibility, VisibilityOff } from "@mui/icons-material";

import authService from "../services/authService";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        username: form.email,
        email: form.email,
        password: form.password,
      });

      navigate("/login", {
        state: { message: "Account created successfully. Please sign in." },
      });
    } catch (err) {
      const data = err.response?.data;

      const errorMessage = data
        ? Object.entries(data)
            .map(([field, messages]) =>
              `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`
            )
            .join(" | ")
        : "Unable to create account. Please try again.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #EFF6FF, #F8FAFC)",
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Box
          sx={{
            backgroundColor: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 3,
            p: { xs: 3, sm: 4 },
            boxShadow: "0 12px 40px rgba(15,23,42,0.06)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 4 }}>
            <AutoAwesome color="primary" fontSize="large" />
            <Typography variant="h5" fontWeight={700}>KnowHub AI</Typography>
          </Box>

          <Typography variant="h4" sx={{ mb: 1 }}>
            Create account
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Start building your intelligent knowledge workspace.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleRegister}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>Full name / Username</Typography>
            <TextField
              name="username"
              placeholder="Your name"
              value={form.username}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />

            <Typography fontWeight={600} sx={{ mb: 1 }}>Email address</Typography>
            <TextField
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />

            <Typography fontWeight={600} sx={{ mb: 1 }}>Password</Typography>
            <TextField
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              inputProps={{ minLength: 8 }}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography fontWeight={600} sx={{ mb: 1 }}>Confirm password</Typography>
            <TextField
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center" sx={{ mt: 3 }} color="text.secondary">
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#2563EB", fontWeight: 600 }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default Register;