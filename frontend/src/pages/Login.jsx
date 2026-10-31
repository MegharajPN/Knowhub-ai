
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
} from "@mui/material";

import {
  Visibility,
  VisibilityOff,
  AutoAwesome,
  LockOutlined,
  DescriptionOutlined,
  SearchOutlined,
  PsychologyOutlined,
} from "@mui/icons-material";

import authService from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.login(email, password);
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.detail ||
        data?.non_field_errors?.[0] ||
        "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", backgroundColor: "#F8FAFC" }}>
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "48%",
          background: "linear-gradient(145deg, #172554 0%, #1E40AF 100%)",
          color: "white",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 7,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <AutoAwesome sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700}>KnowHub AI</Typography>
          </Box>

          <Box sx={{ mt: 13, maxWidth: 460 }}>
            <Typography variant="h3" fontWeight={700} sx={{ lineHeight: 1.2, mb: 3 }}>
              Your knowledge.
              <br />
              One intelligent
              <br />
              workspace.
            </Typography>

            <Typography sx={{ color: "#CBD5E1", fontSize: 17, lineHeight: 1.8 }}>
              Upload your documents, ask questions in natural language,
              and get intelligent answers backed by your own knowledge.
            </Typography>
          </Box>

          <Box sx={{ mt: 7, display: "flex", flexDirection: "column", gap: 3 }}>
            {[
              {
                icon: <DescriptionOutlined />,
                title: "Document intelligence",
                description: "Extract and understand your PDF documents.",
              },
              {
                icon: <SearchOutlined />,
                title: "Smart knowledge retrieval",
                description: "Find relevant information from your files.",
              },
              {
                icon: <PsychologyOutlined />,
                title: "AI-powered answers",
                description: "Get contextual answers with source references.",
              },
            ].map((item) => (
              <Box key={item.title} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Box sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  display: "grid",
                  placeItems: "center",
                }}>
                  {item.icon}
                </Box>
                <Box>
                  <Typography fontWeight={600}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: "#CBD5E1" }}>
                    {item.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography variant="body2" sx={{ color: "#CBD5E1" }}>
          © 2026 KnowHub AI. Built for smarter knowledge management.
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Container maxWidth="xs">
          <Box sx={{ mb: 5, display: { xs: "block", md: "none" } }}>
            <Typography variant="h5" fontWeight={700}>
              <AutoAwesome color="primary" /> KnowHub AI
            </Typography>
          </Box>

          <Typography variant="h4" sx={{ mb: 1 }}>Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Sign in to continue to your workspace.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleLogin}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>Email address</Typography>

            <TextField
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography fontWeight={600}>Password</Typography>
              <Typography variant="body2" color="primary" sx={{ cursor: "pointer" }}>
                Forgot password?
              </Typography>
            </Box>

            <TextField
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              sx={{ mb: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
              }
              label={<Typography variant="body2" color="text.secondary">Remember me</Typography>}
              sx={{ mb: 2 }}
            />

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">SECURE WORKSPACE</Typography>
          </Divider>

          <Typography variant="body2" textAlign="center" color="text.secondary">
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#2563EB", fontWeight: 600 }}>
              Create account
            </Link>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

export default Login;
