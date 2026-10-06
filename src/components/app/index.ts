/* App UI kit barrel. Client components are marked "use client" in their own
   files; importing from here is fine in server components too. */
export { Icon, ICON_NAMES, type IconName } from "./icons";
export { Button, buttonClass, type ButtonVariant, type ButtonSize } from "./Button";
export { Card, CardHeader, DescriptionList } from "./Card";
export { Badge, StatusPill, DemoPill, SampleNote, STATUS_META, type BadgeTone } from "./Badge";
export { Avatar, AvatarGroup, Rating, ProgressBar, ProgressRing, Skeleton, EmptyState, type AvatarSize } from "./Display";
export { PageHeader, Breadcrumbs, StatTile, StatGrid, type Crumb } from "./PageHeader";
export { Field, Input, SearchInput, Textarea, Select, Checkbox, RadioGroup, Switch, Segmented, type SelectOption, type InputProps } from "./Form";
export { Modal, Drawer, ConfirmDialog, DropdownMenu, Tooltip, useIsClient, type MenuItem } from "./Overlay";
export { Toaster, toast, type ToastInput, type ToastTone } from "./Toast";
export { Tabs, TabPanel, Pagination, useOverflowFade, scrollIntoViewX, type TabItem } from "./Navigation";
export { DataTable, type Column, type SortState } from "./DataTable";
export { UnsavedChangesGuard, useNavigationGuard, useBeforeUnload, registerNavigationGuard, whenNavigationAllowed, confirmNavigation, type NavigationAttempt, type NavigationGuard } from "./NavigationGuard";
export { BarChart, LineChart, AreaChart, Donut, Sparkline, type Datum, type LineSeries } from "./Charts";
export { CourseCard } from "./CourseCard";
export { ApplicationFacts, ApplicationHistory, ApplicationReview } from "./ApplicationFacts";
export { DashboardShell } from "./DashboardShell";
export { RoleGate } from "./RoleGate";
export { SiteShell } from "./SiteShell";
export { BeingBuilt, PublicBeingBuilt } from "./Placeholder";
export { AREAS, areaOf, isAppArea, isActive, navBadgeSr, type AreaKey, type SiteArea, type NavItem, type NavBadge } from "./nav";
/* Mobile kit (.qa/mobile/MOBILE_SPEC.md §1) */
export { BottomSheet, ActionSheet, FullScreenSheet, type SheetProps, type SheetDetent } from "./Sheet";
export { StickyActionBar } from "./StickyActionBar";
export { MinimalFooter } from "@/components/landing/Footer";
export {
  useMediaQuery,
  useIsPhone,
  useIsCoarse,
  useIsShortLandscape,
  isPhone,
  isCoarse,
  useScrollHide,
  useScrolledPast,
  useBottomUi,
  setBottomUi,
  useActionBarPresent,
  useKeyboardOpen,
  useKeyboardInset,
  PHONE_QUERY,
  COARSE_QUERY,
  LAND_QUERY,
} from "./mobile";
export { moreItems, detailParent } from "./nav";
