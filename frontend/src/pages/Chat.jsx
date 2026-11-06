
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
// import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PersonIcon from "@mui/icons-material/Person";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import {
  getConversations,
  createConversation,
  getConversation,
  askConversation,
  deleteConversation,
} from "../services/conversationService";

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  const [historyOpen, setHistoryOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversation history.
  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();

      setConversations(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      setError("Unable to load your conversations.");
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Automatically scroll to the latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  // Open an existing conversation.
  const openConversation = async (conversationId) => {
    if (loading) return;

    setLoadingHistory(true);
    setError("");

    try {
      const data = await getConversation(conversationId);

      setActiveConversation(data);
      setMessages(data.messages || []);
    } catch (err) {
      setError("Unable to load this conversation.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Start a new conversation.
  const handleNewChat = () => {
    if (loading) return;

    setActiveConversation(null);
    setMessages([]);
    setQuestion("");
    setError("");
    inputRef.current?.focus();
  };

  // Delete a conversation.
  const handleDeleteConversation = async (event, conversationId) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) return;

    try {
      await deleteConversation(conversationId);

      setConversations((previous) =>
        previous.filter((item) => item.id !== conversationId)
      );

      if (activeConversation?.id === conversationId) {
        handleNewChat();
      }
    } catch (err) {
      setError("Unable to delete this conversation.");
    }
  };

  // Send a message to the AI assistant.
  const handleSend = async (event) => {
    event.preventDefault();

    const userQuestion = question.trim();

    if (!userQuestion || loading || loadingHistory) return;

    setQuestion("");
    setError("");
    setLoading(true);

    const temporaryUserMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userQuestion,
      sources: [],
    };

    setMessages((previous) => [
      ...previous,
      temporaryUserMessage,
    ]);

    try {
      let conversation = activeConversation;

      // Create a conversation for the first question.
      if (!conversation) {
        conversation = await createConversation(
          userQuestion.slice(0, 60)
        );

        setActiveConversation(conversation);
      }

      await askConversation(
        conversation.id,
        userQuestion,
        5
      );

      // Fetch the persisted conversation and messages.
      const updatedConversation = await getConversation(
        conversation.id
      );

      setActiveConversation(updatedConversation);
      setMessages(updatedConversation.messages || []);

      await loadConversations();
    } catch (err) {
      // Keep the question visible so the user can see what failed.
      setError(
        err.response?.data?.message ||
          "Unable to generate an answer. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const conversationHistory = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#FFFFFF",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewChat}
          disabled={loading}
          sx={{
            py: 1.2,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            boxShadow: "none",
          }}
        >
          New conversation
        </Button>
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 2 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={700}
          letterSpacing={1}
        >
          YOUR HISTORY
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, pb: 2 }}>
        {conversations.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 5, px: 2 }}>
            <ForumOutlinedIcon
              sx={{ fontSize: 32, color: "#94A3B8", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No conversations yet.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.5}>
            {conversations.map((conversation) => {
              const selected =
                activeConversation?.id === conversation.id;

              return (
                <Box
                  key={conversation.id}
                  onClick={() => openConversation(conversation.id)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 2,
                    px: 1,
                    py: 0.7,
                    cursor: loading ? "default" : "pointer",
                    bgcolor: selected ? "#EFF6FF" : "transparent",
                    "&:hover": {
                      bgcolor: selected ? "#EFF6FF" : "#F8FAFC",
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      fontSize={13}
                      fontWeight={selected ? 700 : 500}
                      color={selected ? "#2563EB" : "#334155"}
                      noWrap
                    >
                      {conversation.title || "New conversation"}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {formatDate(conversation.updated_at)}
                    </Typography>
                  </Box>

                  <Tooltip title="Delete conversation">
                    <IconButton
                      size="small"
                      disabled={loading}
                      onClick={(event) =>
                        handleDeleteConversation(
                          event,
                          conversation.id
                        )
                      }
                      sx={{
                        color: "#94A3B8",
                        "&:hover": { color: "#DC2626" },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar
            sx={{
              width: 30,
              height: 30,
              bgcolor: "#DBEAFE",
              color: "#2563EB",
            }}
          >
            <AutoAwesomeIcon fontSize="small" />
          </Avatar>

          <Box>
            <Typography fontSize={12} fontWeight={700}>
              KnowHub AI
            </Typography>
            <Typography fontSize={10} color="text.secondary">
              Local AI Assistant
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        height: {
          xs: "calc(100vh - 112px)",
          md: "calc(100vh - 136px)",
        },
        minHeight: 500,
        maxHeight: 1000,
        bgcolor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {/* Conversation history */}
      {historyOpen && (
        <Box
          sx={{
            width: 270,
            flexShrink: 0,
            borderRight: "1px solid #E2E8F0",
            display: { xs: "none", md: "block" },
          }}
        >
          {conversationHistory}
        </Box>
      )}

      {/* Main chat workspace */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#F8FAFC",
        }}
      >
        {/* Chat header */}
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.5,
            bgcolor: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
          >
            <IconButton
              size="small"
              onClick={() => setHistoryOpen(!historyOpen)}
              sx={{ display: { xs: "none", md: "inline-flex" } }}
            >
              <MenuOpenIcon />
            </IconButton>

            <Avatar
              sx={{
                bgcolor: "#DBEAFE",
                color: "#2563EB",
                width: 36,
                height: 36,
              }}
            >
              <SmartToyOutlinedIcon />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} fontSize={14}>
                {activeConversation?.title || "New conversation"}
              </Typography>

              <Stack direction="row" spacing={0.7} alignItems="center">
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "#16A34A",
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  KnowHub AI Assistant
                </Typography>
              </Stack>
            </Box>

            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleNewChat}
              disabled={loading}
              sx={{
                textTransform: "none",
                display: { xs: "none", sm: "inline-flex" },
              }}
            >
              New chat
            </Button>
          </Stack>
        </Box>

        {/* Mobile conversation history */}
        <Box
          sx={{
            display: { xs: "block", md: "none" },
            bgcolor: "#FFFFFF",
            px: 2,
            py: 1,
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <Button
            size="small"
            startIcon={<ForumOutlinedIcon />}
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            {historyOpen ? "Hide history" : "Conversation history"}
          </Button>

          {historyOpen && (
            <Box sx={{ maxHeight: 180, overflowY: "auto", mt: 1 }}>
              {conversationHistory}
            </Box>
          )}
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: { xs: 2, md: 5 },
            py: 3,
          }}
        >
          {error && (
            <Alert
              severity="error"
              onClose={() => setError("")}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {loadingHistory ? (
            <Box
              sx={{
                height: "100%",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box
              sx={{
                minHeight: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                maxWidth: 600,
                mx: "auto",
                px: 2,
              }}
            >
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "#DBEAFE",
                  color: "#2563EB",
                  mb: 2.5,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 32 }} />
              </Avatar>

              <Typography variant="h4" fontWeight={800}>
                Ask your knowledge base
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mt: 1.5, mb: 4, lineHeight: 1.8 }}
              >
                Your AI assistant can find information inside your
                uploaded documents and answer your questions with sources.
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ width: "100%" }}
              >
                {[
                  "Summarize my uploaded documents",
                  "What are the main topics in my documents?",
                  "Find important information",
                ].map((suggestion) => (
                  <Card
                    key={suggestion}
                    variant="outlined"
                    onClick={() => {
                      setQuestion(suggestion);
                      inputRef.current?.focus();
                    }}
                    sx={{
                      flex: 1,
                      p: 2,
                      borderRadius: 2,
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: "#2563EB",
                        bgcolor: "#EFF6FF",
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                    >
                      <Typography
                        variant="body2"
                        textAlign="left"
                        fontWeight={500}
                        sx={{ flex: 1 }}
                      >
                        {suggestion}
                      </Typography>
                      <ArrowForwardIcon
                        fontSize="small"
                        color="action"
                      />
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Box>
          ) : (
            <Stack spacing={3} sx={{ maxWidth: 850, mx: "auto" }}>
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <Box
                    key={message.id}
                    sx={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      gap: 1.5,
                    }}
                  >
                    {!isUser && (
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          bgcolor: "#DBEAFE",
                          color: "#2563EB",
                          flexShrink: 0,
                        }}
                      >
                        <SmartToyOutlinedIcon fontSize="small" />
                      </Avatar>
                    )}

                    <Box
                      sx={{
                        maxWidth: { xs: "88%", md: "82%" },
                        minWidth: 0,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          px: 2.2,
                          py: 1.8,
                          borderRadius: 3,
                          bgcolor: isUser ? "#2563EB" : "#FFFFFF",
                          color: isUser ? "#FFFFFF" : "#1E293B",
                          border: isUser ? "none" : "1px solid #E2E8F0",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            lineHeight: 1.85,
                          }}
                        >
                          {message.content}
                        </Typography>
                      </Paper>

                      {/* Retrieved document sources */}
                      {!isUser && message.sources?.length > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                          <Stack
                            direction="row"
                            spacing={0.8}
                            alignItems="center"
                            sx={{ mb: 1 }}
                          >
                            <DescriptionOutlinedIcon
                              sx={{ fontSize: 17, color: "#64748B" }}
                            />

                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="text.secondary"
                            >
                              REFERENCED DOCUMENTS
                            </Typography>

                            <Chip
                              size="small"
                              label={message.sources.length}
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          </Stack>

                          <Stack spacing={1}>
                            {message.sources.map((source, index) => (
                              <Paper
                                key={source.chunk_id || index}
                                variant="outlined"
                                sx={{
                                  px: 1.5,
                                  py: 1.2,
                                  borderRadius: 2,
                                  bgcolor: "#FFFFFF",
                                }}
                              >
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                >
                                  <DescriptionOutlinedIcon
                                    fontSize="small"
                                    color="primary"
                                  />

                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                      noWrap
                                    >
                                      {source.document_title || "Document"}
                                    </Typography>

                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Page {source.page_number}
                                      {source.similarity != null
                                        ? ` · Similarity ${Number(
                                            source.similarity
                                          ).toFixed(3)}`
                                        : ""}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>

                    {isUser && (
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          bgcolor: "#E2E8F0",
                          color: "#475569",
                          flexShrink: 0,
                        }}
                      >
                        <PersonIcon fontSize="small" />
                      </Avatar>
                    )}
                  </Box>
                );
              })}

              {loading && (
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                >
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "#DBEAFE",
                      color: "#2563EB",
                    }}
                  >
                    <SmartToyOutlinedIcon fontSize="small" />
                  </Avatar>

                  <Paper
                    variant="outlined"
                    sx={{ px: 2, py: 1.5, borderRadius: 3 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        KnowHub AI is thinking...
                      </Typography>
                    </Stack>
                  </Paper>
                </Stack>
              )}

              <div ref={messagesEndRef} />
            </Stack>
          )}
        </Box>

        {/* Message composer */}
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            pt: 1.5,
            pb: 2,
            bgcolor: "#FFFFFF",
            borderTop: "1px solid #E2E8F0",
          }}
        >
          <Box
            component="form"
            onSubmit={handleSend}
            sx={{ maxWidth: 850, mx: "auto" }}
          >
            <Paper
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: 1,
                p: 1,
                border: "1px solid #CBD5E1",
                borderRadius: 3,
                "&:focus-within": {
                  borderColor: "#2563EB",
                  boxShadow: "0 0 0 3px rgba(37,99,235,0.08)",
                },
              }}
            >
              <TextField
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={5}
                placeholder="Ask a question about your documents..."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={loading || loadingHistory}
                variant="standard"
                slotProps={{
                  htmlInput: { maxLength: 1000 },
                }}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    px: 1,
                    py: 0.8,
                    fontSize: 14,
                  },
                }}
              />

              <Tooltip title="Send message">
                <span>
                  <IconButton
                    type="submit"
                    disabled={
                      loading ||
                      loadingHistory ||
                      !question.trim()
                    }
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      bgcolor: "#2563EB",
                      color: "#FFFFFF",
                      "&:hover": { bgcolor: "#1D4ED8" },
                      "&.Mui-disabled": {
                        bgcolor: "#E2E8F0",
                        color: "#94A3B8",
                      },
                    }}
                  >
                    <SendRoundedIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Paper>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                textAlign: "center",
                mt: 1.2,
                fontSize: 11,
              }}
            >
              AI-generated answers may be inaccurate. Verify important
              information against the original documents.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
