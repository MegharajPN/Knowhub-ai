
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import {
  AutoAwesome,
  Dashboard as DashboardIcon,
  Description,
  Search,
  Forum,
  Menu as MenuIcon,
  Logout,
  Close,
} from "@mui/icons-material";

import authService from "../services/authService";

const drawerWidth = 250;

const navigationItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardIcon />,
  },
  {
    label: "Documents",
    path: "/documents",
    icon: <Description />,
  },
  {
    label: "Search",
    path: "/search",
    icon: <Search />,
  },
  {
    label: "AI Chat",
    path: "/chat",
    icon: <Forum />,
  },
];

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    authService
      .getCurrentUser()
      .then((data) => {
        if (active) setUser(data);
      })
      .catch(() => {
        authService.logout();
        navigate("/login", { replace: true });
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#FFFFFF",
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          height: 72,
          px: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: "#2563EB",
              width: 38,
              height: 38,
              borderRadius: 2,
            }}
          >
            <AutoAwesome />
          </Avatar>

          <Box>
            <Typography fontWeight={800} fontSize={17} color="#0F172A">
              KnowHub AI
            </Typography>
            <Typography fontSize={10} color="#64748B">
              Knowledge Workspace
            </Typography>
          </Box>
        </Box>

        {isMobile && (
          <IconButton onClick={() => setMobileOpen(false)}>
            <Close />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ px: 2, pt: 3 }}>
        <Typography
          sx={{
            px: 1.5,
            mb: 1.5,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            color: "#94A3B8",
          }}
        >
          WORKSPACE
        </Typography>

        <List disablePadding>
          {navigationItems.map((item) => {
            const selected = location.pathname === item.path;

            return (
              <ListItemButton
                key={item.path}
                selected={selected}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mb: 0.7,
                  py: 1.3,
                  px: 1.5,
                  borderRadius: 2,
                  color: selected ? "#2563EB" : "#475569",
                  "&.Mui-selected": {
                    bgcolor: "#EFF6FF",
                    color: "#2563EB",
                  },
                  "&.Mui-selected:hover": {
                    bgcolor: "#DBEAFE",
                  },
                  "&:hover": {
                    bgcolor: "#F8FAFC",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: "inherit",
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: selected ? 700 : 500,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {/* User section */}
      <Divider />

      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 1.5,
            px: 0.5,
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: "#DBEAFE",
              color: "#1D4ED8",
              fontWeight: 700,
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              fontWeight={700}
              fontSize={13}
              noWrap
              color="#0F172A"
            >
              {user?.username || "Loading..."}
            </Typography>
            <Typography
              fontSize={11}
              color="#64748B"
              noWrap
            >
              {user?.email || ""}
            </Typography>
          </Box>
        </Box>

        <Button
          fullWidth
          color="inherit"
          startIcon={<Logout />}
          onClick={handleLogout}
          sx={{
            justifyContent: "flex-start",
            color: "#64748B",
            textTransform: "none",
            px: 1.5,
            py: 1,
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      {/* Top navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "#FFFFFF",
          color: "#0F172A",
          borderBottom: "1px solid #E2E8F0",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: "72px !important" }}>
          {isMobile && (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            fontWeight={700}
            sx={{ flexGrow: 1, fontSize: 15 }}
          >
            {navigationItems.find(
              (item) => item.path === location.pathname
            )?.label || "KnowHub AI"}
          </Typography>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Search />}
            onClick={() => navigate("/search")}
            sx={{
              textTransform: "none",
              borderColor: "#E2E8F0",
              color: "#475569",
              mr: 1.5,
            }}
          >
            Search
          </Button>

          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: "#DBEAFE",
              color: "#1D4ED8",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* Desktop sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid #E2E8F0",
              top: 0,
              height: "100vh",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main page content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
          pt: "72px",
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default DashboardLayout;