
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
  Chip,
} from "@mui/material";

import {
  AutoAwesome,
  Logout,
  Description,
  Forum,
  CheckCircle,
  CloudUpload,
  SmartToy,
  ArrowForward,
  AccessTime,
} from "@mui/icons-material";

import authService from "../services/authService";
import api from "../services/api";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const loadDashboardData = useCallback(async () => {
    try {
      const [documentResponse, conversationResponse] =
        await Promise.all([
          api.get("documents/"),
          api.get("conversations/"),
        ]);

      const documentData =
        documentResponse.data.results || documentResponse.data;

      setDocuments(Array.isArray(documentData) ? documentData : []);
      setConversations(
        Array.isArray(conversationResponse.data)
          ? conversationResponse.data
          : []
      );
    } catch (error) {
      setDataError("Unable to load dashboard statistics.");
    }
  }, []);

  useEffect(() => {
    let active = true;

    const initializeDashboard = async () => {
      try {
        const userData = await authService.getCurrentUser();

        if (!active) return;

        setUser(userData);
        await loadDashboardData();
      } catch (error) {
        authService.logout();
        navigate("/login", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };

    initializeDashboard();

    return () => {
      active = false;
    };
  }, [navigate, loadDashboardData]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return null;

  const completedDocuments = documents.filter(
    (document) => document.status === "completed"
  ).length;

  const processingDocuments = documents.filter(
    (document) => document.status === "processing"
  ).length;

  const recentDocuments = [...documents]
    .sort(
      (a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    )
    .slice(0, 5);

  const recentConversations = conversations.slice(0, 5);

  const stats = [
    {
      title: "Total Documents",
      value: documents.length,
      icon: <Description />,
      color: "#2563EB",
      background: "#DBEAFE",
    },
    {
      title: "Ready Documents",
      value: completedDocuments,
      icon: <CheckCircle />,
      color: "#16A34A",
      background: "#DCFCE7",
    },
    {
      title: "Processing",
      value: processingDocuments,
      icon: <AccessTime />,
      color: "#D97706",
      background: "#FEF3C7",
    },
    {
      title: "Conversations",
      value: conversations.length,
      icon: <Forum />,
      color: "#7C3AED",
      background: "#EDE9FE",
    },
  ];

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      {/* Header */}
        <Container maxWidth="xl">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: "#2563EB",
                  borderRadius: 2,
                }}
              >
                <AutoAwesome />
              </Avatar>

              <Box>
                <Typography fontWeight={800} variant="h6">
                  KnowHub AI
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Enterprise Knowledge Assistant
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: "#DBEAFE", color: "#1D4ED8" }}>
                {user.username?.charAt(0).toUpperCase()}
              </Avatar>

              <Button
                startIcon={<Logout />}
                onClick={handleLogout}
                color="inherit"
              >
                Logout
              </Button>
            </Stack>
          </Stack>
        </Container>

      <Container maxWidth="xl" sx={{ py: 5 }}>
        {/* Welcome section */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Welcome back, {user.username}!
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Manage your knowledge base and explore your AI assistant.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => navigate("/documents")}
            >
              Documents
            </Button>

            <Button
              variant="contained"
              startIcon={<SmartToy />}
              onClick={() => navigate("/chat")}
            >
              Open AI Chat
            </Button>
          </Stack>
        </Stack>

        {dataError && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {dataError}
            <Button size="small" onClick={loadDashboardData}>
              Retry
            </Button>
          </Alert>
        )}

        {/* Statistics */}
        <Grid container spacing={2.5}>
          {stats.map((stat) => (
            <Grid item xs={12} sm={6} lg={3} key={stat.title}>
              <Card
                elevation={0}
                sx={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 3,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {stat.title}
                      </Typography>

                      <Typography
                        variant="h4"
                        fontWeight={800}
                        sx={{ mt: 1 }}
                      >
                        {stat.value}
                      </Typography>
                    </Box>

                    <Avatar
                      sx={{
                        bgcolor: stat.background,
                        color: stat.color,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {stat.icon}
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Quick actions */}
        <Typography variant="h6" fontWeight={700} sx={{ mt: 5, mb: 2 }}>
          Quick Actions
        </Typography>

        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                border: "1px solid #E2E8F0",
                borderRadius: 3,
                height: "100%",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Avatar sx={{ bgcolor: "#DBEAFE", color: "#2563EB", mb: 2 }}>
                  <CloudUpload />
                </Avatar>

                <Typography variant="h6" fontWeight={700}>
                  Manage Documents
                </Typography>

                <Typography color="text.secondary" sx={{ my: 1.5 }}>
                  Upload and manage your PDF knowledge base.
                </Typography>

                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => navigate("/documents")}
                >
                  View Documents
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                border: "1px solid #E2E8F0",
                borderRadius: 3,
                height: "100%",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Avatar sx={{ bgcolor: "#EDE9FE", color: "#7C3AED", mb: 2 }}>
                  <SmartToy />
                </Avatar>

                <Typography variant="h6" fontWeight={700}>
                  AI Knowledge Assistant
                </Typography>

                <Typography color="text.secondary" sx={{ my: 1.5 }}>
                  Ask natural-language questions and get answers from
                  your uploaded documents.
                </Typography>

                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => navigate("/chat")}
                >
                  Start Conversation
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent activity */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} lg={6}>
            <Card
              elevation={0}
              sx={{
                border: "1px solid #E2E8F0",
                borderRadius: 3,
                height: "100%",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    Recent Documents
                  </Typography>

                  <Button
                    size="small"
                    onClick={() => navigate("/documents")}
                  >
                    View All
                  </Button>
                </Stack>

                {recentDocuments.length === 0 ? (
                  <Typography color="text.secondary" py={3}>
                    No documents uploaded yet.
                  </Typography>
                ) : (
                  recentDocuments.map((document) => (
                    <Box key={document.id}>
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{ py: 1.5 }}
                      >
                        <Avatar sx={{ bgcolor: "#EFF6FF", color: "#2563EB" }}>
                          <Description />
                        </Avatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600} noWrap>
                            {document.title}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {formatDate(document.created_at)}
                          </Typography>
                        </Box>

                        <Chip
                          size="small"
                          label={document.status}
                          color={
                            document.status === "completed"
                              ? "success"
                              : document.status === "failed"
                                ? "error"
                                : "warning"
                          }
                        />
                      </Stack>
                      <Divider />
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card
              elevation={0}
              sx={{
                border: "1px solid #E2E8F0",
                borderRadius: 3,
                height: "100%",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    Recent Conversations
                  </Typography>

                  <Button
                    size="small"
                    onClick={() => navigate("/chat")}
                  >
                    Open Chat
                  </Button>
                </Stack>

                {recentConversations.length === 0 ? (
                  <Typography color="text.secondary" py={3}>
                    No conversations yet.
                  </Typography>
                ) : (
                  recentConversations.map((conversation) => (
                    <Box key={conversation.id}>
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{ py: 1.5 }}
                      >
                        <Avatar sx={{ bgcolor: "#F3E8FF", color: "#7C3AED" }}>
                          <Forum />
                        </Avatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600} noWrap>
                            {conversation.title}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {formatDate(conversation.updated_at)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Divider />
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Account information */}
        <Card
          elevation={0}
          sx={{
            mt: 4,
            border: "1px solid #E2E8F0",
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Account Information
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Username
                </Typography>
                <Typography fontWeight={600}>{user.username}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Email Address
                </Typography>
                <Typography fontWeight={600}>{user.email}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Account ID
                </Typography>
                <Typography fontWeight={600}>{user.id}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "center", mt: 5 }}
        >
          KnowHub AI · Enterprise Knowledge Assistant
        </Typography>
      </Container>
    </Box>
  );
}

export default Dashboard;