import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "chat"; id: string }
  | { name: "tests" }
  | { name: "progress" }
  | { name: "sources" }
  | { name: "settings" }
  | { name: "test"; id: string; review: boolean; q: number | null; part: number | null };

export function parse(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean);
  const num = (k: string) => (params.get(k) ? Number(params.get(k)) : null);
  switch (parts[0]) {
    case "chat":
      return parts[1] ? { name: "chat", id: parts[1] } : { name: "home" };
    case "tests":
      return { name: "tests" };
    case "progress":
      return { name: "progress" };
    case "sources":
      return { name: "sources" };
    case "settings":
      return { name: "settings" };
    case "test":
      if (parts[1]) return { name: "test", id: parts[1], review: parts[2] === "review", q: num("q"), part: num("part") };
  }
  return { name: "home" };
}

export function href(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "chat":
      return `#/chat/${route.id}`;
    case "test": {
      const q = new URLSearchParams();
      if (route.q) q.set("q", String(route.q));
      if (route.part) q.set("part", String(route.part));
      const s = q.toString();
      return `#/test/${route.id}${route.review ? "/review" : ""}${s ? `?${s}` : ""}`;
    }
    default:
      return `#/${route.name}`;
  }
}

export function go(route: Route) {
  location.hash = href(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

/** Open a chat with a message ready to send (used by "Ask the tutor" buttons). */
export function askTutor(conversationId: string, text: string) {
  sessionStorage.setItem(`draft:${conversationId}`, text);
  go({ name: "chat", id: conversationId });
}
