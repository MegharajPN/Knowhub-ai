import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import askQuestion from "../services/chatService";

export default function Chat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async (event) => {
    event.preventDefault();

    const userQuestion = question.trim();

    if (!userQuestion || loading) return;

    setQuestion("");
    setError("");
    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        role: "user",
        content: userQuestion,
      },
    ]);

    setLoading(true);

    try {
      const data = await askQuestion(userQuestion, 5);

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to get an answer. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          KnowHub AI Assistant
        </Typography>

        <Typography color="text.secondary">
          Ask questions about your uploaded documents.
        </Typography>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          minHeight: 430,
          maxHeight: "65vh",
          overflowY: "auto",
          p: { xs: 2, sm: 3 },
          bgcolor: "#F8FAFC",
        }}
      >
        {messages.length === 0 && (
          <Box
            sx={{
              minHeight: 350,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              gap: 2,
            }}
          >
            <SmartToyIcon sx={{ fontSize: 55, color: "primary.main" }} />

            <Typography variant="h6" fontWeight={600}>
              How can I help you?
            </Typography>

            <Typography color="text.secondary">
              Ask about skills, projects, experience or other information
              in your uploaded PDFs.
            </Typography>
          </Box>
        )}

        <Stack spacing={3}>
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: "flex",
                justifyContent:
                  message.role === "user" ? "flex-end" : "flex-start",
                gap: 1,
              }}
            >
              {message.role === "assistant" && (
                <SmartToyIcon color="primary" sx={{ mt: 1 }} />
              )}

              <Box sx={{ maxWidth: "90%", minWidth: 0 }}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor:
                      message.role === "user" ? "#DBEAFE" : "#FFFFFF",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                    <Typography
                      sx={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.8,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {message.content}
                    </Typography>
                  </CardContent>
                </Card>

                {message.sources?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      SOURCES
                    </Typography>

                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {message.sources.map((source) => (
                        <Card
                          key={source.chunk_id}
                          variant="outlined"
                          sx={{ bgcolor: "#FFFFFF" }}
                        >
                          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                            <Typography variant="body2" fontWeight={600}>
                              {source.document_title}
                            </Typography>

                            <Stack
                              direction="row"
                              spacing={1}
                              flexWrap="wrap"
                              sx={{ mt: 1 }}
                            >
                              <Chip
                                size="small"
                                label={`Page ${source.page_number}`}
                              />
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`Score: ${source.similarity}`}
                              />
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>

              {message.role === "user" && (
                <PersonIcon color="action" sx={{ mt: 1 }} />
              )}
            </Box>
          ))}

          {loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <SmartToyIcon color="primary" />
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                KnowHub AI is thinking...
              </Typography>
            </Stack>
          )}
        </Stack>
      </Paper>

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Divider sx={{ my: 2 }} />

      <Box component="form" onSubmit={handleSend}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            placeholder="Ask your question..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={loading}
            inputProps={{ maxLength: 1000 }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading || !question.trim()}
            sx={{ minWidth: 55 }}
          >
            <SendIcon />
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}