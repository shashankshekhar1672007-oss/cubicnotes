import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import GeminiIcon from "./GeminiIcon";
import { useGhostGuard } from "../../hooks/useGhostGuard";
import "../../assets/styles/components/dashboard-carousel.css";

const DashboardCarousel = () => {
  const navigate = useNavigate();
  const { guardAction } = useGhostGuard();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayTimer = useRef(null);

  const CARDS = [
    {
      id: "notes",
      title: "Notes",
      subtitle: "Capture Your Thoughts",
      description: "Jot down sudden ideas, style them with Markdown, pin important thoughts, and keep them within reach.",
      icon: <i className="fa-regular fa-file-lines"></i>,
      bgClass: "card-bg-notes",
      primaryCta: {
        label: "Create Note",
        onClick: () => navigate("/notes", { state: { createNew: true } }),
      },
      secondaryCta: {
        label: "View Notes",
        onClick: () => navigate("/notes"),
      },
      rightSvg: (
        <svg className="card-illustration-svg" viewBox="0 0 100 100" fill="none">
          <rect x="25" y="15" width="50" height="70" rx="6" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <line x1="35" y1="30" x2="65" y2="30" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
          <line x1="35" y1="42" x2="65" y2="42" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
          <line x1="35" y1="54" x2="55" y2="54" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
          <path d="M68 58 L82 72 L78 76 L64 62 Z" fill="rgba(255,255,255,0.12)" />
          <path d="M78 52 L82 56 L70 68 L66 64 Z" fill="rgba(255,255,255,0.2)" />
        </svg>
      )
    },
    {
      id: "notebooks",
      title: "Notebooks",
      subtitle: "Organize with Notebooks",
      description: "Group related thoughts into custom color-coded notebooks. Perfect for projects, classes, or daily logs.",
      icon: <i className="fa-regular fa-folder-open"></i>,
      bgClass: "card-bg-notebooks",
      primaryCta: {
        label: "Create Notebook",
        onClick: () => navigate("/notebooks", { state: { createNew: true } }),
      },
      secondaryCta: {
        label: "View All",
        onClick: () => navigate("/notebooks"),
      },
      rightSvg: (
        <svg className="card-illustration-svg" viewBox="0 0 100 100" fill="none">
          <path d="M20 25 C20 22.2 22.2 20 25 20 H45 L53 30 H75 C77.8 30 80 32.2 80 35 V75 C80 77.8 77.8 80 75 80 H25 C22.2 80 20 77.8 20 75 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <path d="M20 35 H80" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <circle cx="50" cy="55" r="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        </svg>
      )
    },
    {
      id: "tasks",
      title: "Tasks",
      subtitle: "Crush Your Goals",
      description: "Break down goals, set priorities, manage subtasks, and track your accomplishments on a clean checklist.",
      icon: <i className="fa-solid fa-list-check"></i>,
      bgClass: "card-bg-tasks",
      primaryCta: {
        label: "Create Task",
        onClick: () => navigate("/tasks"),
      },
      secondaryCta: {
        label: "View Board",
        onClick: () => navigate("/tasks"),
      },
      rightSvg: (
        <svg className="card-illustration-svg" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="30" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
          <path d="M40 50 L47 57 L62 42" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="25" cy="25" r="4" fill="rgba(255,255,255,0.15)" />
          <circle cx="75" cy="75" r="6" fill="rgba(255,255,255,0.08)" />
        </svg>
      )
    },
    {
      id: "reminders",
      title: "Reminders",
      subtitle: "Never Miss a Beat",
      description: "Configure one-time or repeating reminders linked to notes, ensuring you're alerted exactly when needed.",
      icon: <i className="fa-regular fa-bell"></i>,
      bgClass: "card-bg-reminders",
      primaryCta: {
        label: "Add Reminder",
        onClick: () => navigate("/reminders", { state: { createNew: true } }),
      },
      secondaryCta: {
        label: "View Alerts",
        onClick: () => navigate("/reminders"),
      },
      rightSvg: (
        <svg className="card-illustration-svg" viewBox="0 0 100 100" fill="none">
          <path d="M50 20 C42 20 36 26 36 34 V52 L30 60 V64 H70 V60 L64 52 V34 C64 26 58 20 50 20 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <path d="M45 68 C45 70.8 47.2 73 50 73 C52.8 73 55 70.8 55 68" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <circle cx="50" cy="15" r="3" fill="rgba(255,255,255,0.25)" />
        </svg>
      )
    },
    {
      id: "ai",
      title: "Gemini AI",
      subtitle: "Unleash AI Productivity",
      description: "Summarize articles, auto-complete sentences, or generate creative drafts with Gemini AI integration.",
      icon: <GeminiIcon size={20} />,
      bgClass: "card-bg-ai",
      primaryCta: {
        label: "Try AI Editor",
        onClick: () => navigate("/notes"),
      },
      secondaryCta: {
        label: "Check Credits",
        onClick: () => navigate("/settings", { state: { tab: "ai" } }),
      },
      rightSvg: (
        <div className="card-illustration-ai-sparkles">
          <GeminiIcon size={70} className="glow-sparkle-main" />
          <GeminiIcon size={30} className="glow-sparkle-sec" />
        </div>
      )
    },
    {
      id: "bin",
      title: "Trash Bin",
      subtitle: "Worry-Free Deletions",
      description: "Did you delete something by accident? Recover deleted notes and notebooks anytime from the trash bin.",
      icon: <i className="fa-regular fa-trash-can"></i>,
      bgClass: "card-bg-bin",
      primaryCta: {
        label: "Open Trash Bin",
        onClick: () => navigate("/bin"),
      },
      secondaryCta: {
        label: "Learn More",
        onClick: () => navigate("/bin"),
      },
      rightSvg: (
        <svg className="card-illustration-svg" viewBox="0 0 100 100" fill="none">
          <path d="M30 30 H70 V75 C70 77.8 67.8 80 65 80 H35 C32.2 80 30 77.8 30 75 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <path d="M25 30 H75" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M45 20 H55 C56.1 20 57 20.9 57 22 V30 H43 V22 C43 20.9 43.9 20 45 20 Z" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <line x1="42" y1="42" x2="42" y2="68" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
          <line x1="50" y1="42" x2="50" y2="68" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
          <line x1="58" y1="42" x2="58" y2="68" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    }
  ];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % CARDS.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + CARDS.length) % CARDS.length);
  };

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimer.current = setInterval(handleNext, 6000);
  };

  const stopAutoPlay = () => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
    }
  };

  useEffect(() => {
    if (!isPaused) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [isPaused, activeIndex]);

  const handleCtaClick = (cta) => {
    const labelLower = cta.label.toLowerCase();
    const isWriteAction =
      labelLower.includes("create") ||
      labelLower.includes("add") ||
      labelLower.includes("try") ||
      labelLower.includes("check");

    if (isWriteAction) {
      guardAction(cta.onClick);
    } else {
      cta.onClick();
    }
  };

  return (
    <div
      className="dashboard-carousel-root"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="carousel-slides-track"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {CARDS.map((card) => (
          <div key={card.id} className={`carousel-slide-item ${card.bgClass}`}>

            {/* Background Graphic Blend */}
            <div className="slide-background-graphic">
              {card.rightSvg}
            </div>

            {/* Top Bar Branding & Icons */}
            <div className="slide-top-bar">
              <div className="slide-top-left-badge">
                <span className="badge-icon">{card.icon}</span>
                <span className="badge-text">CubicNotes</span>
              </div>
              <div className="slide-top-right-badge">
                <i className="fa-solid fa-ellipsis"></i>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="slide-bottom-layout">
              <div className="slide-text-group">
                <div className="slide-feature-tag">{card.subtitle}</div>
                <h2 className="slide-title">{card.title}</h2>
                <p className="slide-description">{card.description}</p>
              </div>

              <div className="slide-actions-group">
                {card.secondaryCta && (
                  <button
                    onClick={() => handleCtaClick(card.secondaryCta)}
                    className="slide-btn slide-btn-secondary"
                  >
                    {card.secondaryCta.label}
                  </button>
                )}
                <button
                  onClick={() => handleCtaClick(card.primaryCta)}
                  className="slide-btn slide-btn-primary"
                >
                  {card.primaryCta.label}
                  <i className="fa-solid fa-arrow-right-long btn-arrow-icon"></i>
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        className="carousel-nav-arrow arrow-left"
        onClick={handlePrev}
        aria-label="Previous slide"
      >
        <i className="fa-solid fa-chevron-left"></i>
      </button>
      <button
        type="button"
        className="carousel-nav-arrow arrow-right"
        onClick={handleNext}
        aria-label="Next slide"
      >
        <i className="fa-solid fa-chevron-right"></i>
      </button>

      {/* Pagination Dot Indicators */}
      <div className="carousel-pagination-indicators">
        {CARDS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`pagination-dot-btn ${idx === activeIndex ? "active" : ""}`}
            onClick={() => setActiveIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardCarousel;
