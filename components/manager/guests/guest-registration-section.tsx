"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { CopyIcon, LinkIcon } from "lucide-react";
import {
  cancelGuestRegistrationApplicationAction,
  connectGuestRegistrationUserAction,
  deleteGuestRegistrationApplicationAction,
  openGuestRegistrationInviteAction,
  stopGuestRegistrationInviteAction,
  submitGuestRegistrationStaffAction,
} from "@/app/manager/guests/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { RegistrationWizard } from "@/components/public/registration/registration-wizard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { REGISTRATION_APPLICATION_STATUS_LABELS } from "@/lib/constants/public-registration";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerRegistrationDetailRoute,
  getRegisterGuestRoute,
} from "@/lib/constants/routes";
import { showSuccessToast } from "@/lib/toast";
import type {
  CancelGuestRegistrationApplicationActionState,
  ConnectGuestRegistrationUserActionState,
  DeleteGuestRegistrationApplicationActionState,
  GuestRegistrationLinkUserOption,
  ManagerGuestRegistrationApplicationSummary,
  ManagerGuestRegistrationInvite,
  ManagerGuestRow,
  OpenGuestRegistrationInviteActionState,
  StopGuestRegistrationInviteActionState,
} from "@/types/manager-guest";
import type { RegistrationApplicationStatus } from "@/lib/constants/public-registration";

const initialOpenState: OpenGuestRegistrationInviteActionState = {};
const initialStopState: StopGuestRegistrationInviteActionState = {};
const initialCancelState: CancelGuestRegistrationApplicationActionState = {};
const initialDeleteState: DeleteGuestRegistrationApplicationActionState = {};
const initialConnectState: ConnectGuestRegistrationUserActionState = {};

type GuestRegistrationSectionProps = {
  guest: ManagerGuestRow;
  invite: ManagerGuestRegistrationInvite | null;
  application: ManagerGuestRegistrationApplicationSummary | null;
  linkUsers: GuestRegistrationLinkUserOption[];
};

function userOptionLabel(user: GuestRegistrationLinkUserOption): string {
  const name = user.username?.trim() || "Unnamed user";
  return user.email ? `${name} (${user.email})` : name;
}

function isActiveUnusedInvite(
  invite: ManagerGuestRegistrationInvite | null
): boolean {
  return Boolean(invite && invite.cancelled_at == null && invite.used_at == null);
}

function statusLabel(status: string): string {
  return (
    REGISTRATION_APPLICATION_STATUS_LABELS[
      status as RegistrationApplicationStatus
    ] ?? status
  );
}

function subscribeNoop() {
  return () => {};
}

function getWindowOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return "";
}

export function GuestRegistrationSection({
  guest,
  invite: initialInvite,
  application: initialApplication,
  linkUsers,
}: GuestRegistrationSectionProps) {
  const router = useRouter();
  const [invite, setInvite] = useState(initialInvite);
  const [application, setApplication] = useState(initialApplication);
  const [prevInvite, setPrevInvite] = useState(initialInvite);
  const [prevApplication, setPrevApplication] = useState(initialApplication);
  const [isStaffFillOpen, setIsStaffFillOpen] = useState(false);
  const [isStaffFillPending, setIsStaffFillPending] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRotateOpen, setIsRotateOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [isTransitionPending, startTransition] = useTransition();

  if (initialInvite !== prevInvite) {
    setInvite(initialInvite);
    setPrevInvite(initialInvite);
  }
  if (initialApplication !== prevApplication) {
    setApplication(initialApplication);
    setPrevApplication(initialApplication);
  }

  const [openState, openAction, isOpenPending] = useActionState(
    openGuestRegistrationInviteAction,
    initialOpenState
  );
  const [stopState, stopAction, isStopPending] = useActionState(
    stopGuestRegistrationInviteAction,
    initialStopState
  );
  const [cancelState, cancelAction, isCancelPending] = useActionState(
    cancelGuestRegistrationApplicationAction,
    initialCancelState
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteGuestRegistrationApplicationAction,
    initialDeleteState
  );
  const [connectState, connectAction, isConnectPending] = useActionState(
    connectGuestRegistrationUserAction,
    initialConnectState
  );

  const isOpenBusy = isOpenPending || isTransitionPending;
  const isStopBusy = isStopPending || isTransitionPending;
  const isCancelBusy = isCancelPending || isTransitionPending;
  const isDeleteBusy = isDeletePending || isTransitionPending;
  const isConnectBusy = isConnectPending || isTransitionPending;
  const isRotateBusy = isOpenBusy;

  const handleCancelOpenChange = usePendingAwareOpenChange(
    isCancelBusy,
    setIsCancelOpen
  );
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteBusy,
    setIsDeleteOpen
  );
  const handleRotateOpenChange = usePendingAwareOpenChange(
    isRotateBusy,
    setIsRotateOpen
  );
  const handleStaffFillOpenChange = usePendingAwareOpenChange(
    isStaffFillPending,
    setIsStaffFillOpen
  );
  const handleConnectOpenChange = usePendingAwareOpenChange(
    isConnectBusy,
    (open) => {
      setIsConnectOpen(open);
      if (open) {
        setSelectedUserId(application?.user_id ?? "");
        setUserFilter("");
      }
    }
  );

  useActionStateToast(openState, isOpenPending);
  useActionStateToast(stopState, isStopPending);
  useActionStateToast(cancelState, isCancelPending);
  useActionStateToast(deleteState, isDeletePending);
  useActionStateToast(connectState, isConnectPending);

  useActionStateSuccess(openState, isOpenPending, () => {
    if (openState.invite) setInvite(openState.invite);
    setIsRotateOpen(false);
  });
  useActionStateSuccess(stopState, isStopPending, () => {
    if (stopState.invite) setInvite(stopState.invite);
  });
  useActionStateSuccess(cancelState, isCancelPending, () => {
    setIsCancelOpen(false);
    setApplication((current) =>
      current ? { ...current, status: "cancelled" } : current
    );
    setInvite((current) =>
      current
        ? { ...current, cancelled_at: current.cancelled_at ?? new Date().toISOString() }
        : current
    );
  });
  useActionStateSuccess(deleteState, isDeletePending, () => {
    setIsDeleteOpen(false);
    setApplication(null);
    setInvite((current) =>
      current ? { ...current, application_id: null } : current
    );
  });
  useActionStateSuccess(connectState, isConnectPending, () => {
    if (connectState.application) {
      setApplication(connectState.application);
      setPrevApplication(connectState.application);
    }
    setIsConnectOpen(false);
  });

  const activeInvite = isActiveUnusedInvite(invite);
  const invitePath = invite ? getRegisterGuestRoute(invite.token) : null;
  const origin = useSyncExternalStore(
    subscribeNoop,
    getWindowOrigin,
    getServerOrigin
  );
  const invitePublicUrl = invitePath
    ? origin
      ? `${origin}${invitePath}`
      : invitePath
    : null;

  const hasSubmittedApp =
    Boolean(application) && application?.status !== "cancelled";
  const canReopen =
    !hasSubmittedApp &&
    (!invite || invite.cancelled_at != null || invite.used_at != null);
  const canConnectUser = guest.status === "finished";
  const linkedUser = application?.user_id
    ? linkUsers.find((user) => user.id === application.user_id)
    : undefined;
  const linkedUserLabel = linkedUser
    ? userOptionLabel(linkedUser)
    : application?.user_id
      ? "Linked user"
      : null;
  const filteredLinkUsers = useMemo(() => {
    const query = userFilter.trim().toLowerCase();
    if (!query) return linkUsers;
    return linkUsers.filter((user) => {
      const label = userOptionLabel(user).toLowerCase();
      return label.includes(query);
    });
  }, [linkUsers, userFilter]);
  const userSelectItems = useMemo(
    () =>
      filteredLinkUsers.map((user) => ({
        value: user.id,
        label: userOptionLabel(user),
      })),
    [filteredLinkUsers]
  );
  const selectedUserLabel = useMemo(() => {
    const selected = linkUsers.find((user) => user.id === selectedUserId);
    return selected ? userOptionLabel(selected) : null;
  }, [linkUsers, selectedUserId]);
  const connectUserError = connectState.fieldErrors?.user_id?.[0];

  function runOpen(rotate = false) {
    const formData = new FormData();
    formData.set("guest_id", guest.id);
    if (rotate) formData.set("rotate", "true");
    startTransition(() => {
      openAction(formData);
    });
  }

  function runStop() {
    const formData = new FormData();
    formData.set("guest_id", guest.id);
    startTransition(() => {
      stopAction(formData);
    });
  }

  function runCancel() {
    const formData = new FormData();
    formData.set("guest_id", guest.id);
    startTransition(() => {
      cancelAction(formData);
    });
  }

  function runDelete() {
    const formData = new FormData();
    formData.set("guest_id", guest.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  function runConnect() {
    if (!selectedUserId) return;
    const formData = new FormData();
    formData.set("guest_id", guest.id);
    formData.set("user_id", selectedUserId);
    startTransition(() => {
      connectAction(formData);
    });
  }

  async function handleCopyUrl() {
    if (!invitePath) return;
    const url = `${window.location.origin}${invitePath}`;
    await navigator.clipboard.writeText(url);
    showSuccessToast("Invite link copied.");
  }

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-base">Registration</CardTitle>
          <CardDescription>
            One active dossier per guest via public link or staff fill.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-5">
          {!invite && !application ? (
            <p className="text-sm text-muted-foreground">
              No registration invite yet.
            </p>
          ) : null}

          {invite ? (
            <div className="space-y-2 text-sm">
              <p>
                Status:{" "}
                {invite.cancelled_at
                  ? "Stopped"
                  : invite.used_at
                    ? "Used"
                    : "Open"}
              </p>
              {activeInvite && invitePath ? (
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={invitePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-full truncate rounded bg-muted px-2 py-1 text-xs underline-offset-2 hover:underline"
                  >
                    {invitePublicUrl ?? invitePath}
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopyUrl()}
                  >
                    <CopyIcon data-icon="inline-start" />
                    Copy link
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {application ? (
            <div className="space-y-2 text-sm">
              <p>
                Application: {statusLabel(application.status)}
              </p>
              {linkedUserLabel ? (
                <p>Linked user: {linkedUserLabel}</p>
              ) : null}
              <Link
                href={getManagerRegistrationDetailRoute(application.id)}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <LinkIcon className="size-4" />
                View application
              </Link>
            </div>
          ) : null}

          {canConnectUser ? (
            <div className="space-y-2 border-t pt-4">
              {!hasSubmittedApp ? (
                <p className="text-sm text-muted-foreground">
                  No registration application to connect to a user.
                </p>
              ) : (
                <Can permission={PERMISSIONS.GUESTS_REGISTRATION_MANAGE}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleConnectOpenChange(true)}
                    disabled={isConnectBusy}
                  >
                    {application?.user_id
                      ? "Change linked user"
                      : "Connect to user"}
                  </Button>
                </Can>
              )}
            </div>
          ) : null}

          <Can permission={PERMISSIONS.GUESTS_REGISTRATION_MANAGE}>
            <div className="flex flex-wrap gap-2">
              {(!invite || canReopen) && !hasSubmittedApp ? (
                <Button
                  type="button"
                  onClick={() => runOpen()}
                  disabled={isOpenBusy}
                >
                  {isOpenBusy ? <InlineSpinner /> : null}
                  {invite ? "Reopen registration" : "Open registration"}
                </Button>
              ) : null}

              {activeInvite ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={runStop}
                    disabled={isStopBusy}
                  >
                    {isStopBusy ? <InlineSpinner /> : null}
                    Stop invite
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRotateOpen(true)}
                    disabled={isRotateBusy}
                  >
                    Generate new link
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsStaffFillOpen(true)}
                  >
                    Fill as staff
                  </Button>
                </>
              ) : null}

              {hasSubmittedApp ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCancelOpen(true)}
                  >
                    Cancel application
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    Hard-delete application
                  </Button>
                </>
              ) : null}
            </div>
          </Can>
        </CardContent>
      </Card>

      <Sheet open={isStaffFillOpen} onOpenChange={handleStaffFillOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl"
          showCloseButton={!isStaffFillPending}
        >
          <SheetHeader>
            <SheetTitle>Fill registration as staff</SheetTitle>
            <SheetDescription>
              Prefills guest details. Submitting marks the invite used.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col px-4 pb-8">
            <RegistrationWizard
              mode="guest-staff"
              hidePageHeader
              guestId={guest.id}
              ageHint={guest.age}
              submitAction={submitGuestRegistrationStaffAction}
              onPendingChange={setIsStaffFillPending}
              onSuccess={() => {
                setIsStaffFillOpen(false);
                router.refresh();
              }}
              initialDraft={{
                full_name: guest.full_name,
                phone: guest.phone,
                education_level: guest.education_level,
                organization_name: guest.school_or_university ?? "",
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isCancelOpen} onOpenChange={handleCancelOpenChange}>
        <DialogContent showCloseButton={!isCancelBusy}>
          <DialogHeader>
            <DialogTitle>Cancel registration?</DialogTitle>
            <DialogDescription>
              Sets the application to cancelled and stops the invite. You can
              reopen a new invite afterward.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isCancelBusy}
              onClick={() => handleCancelOpenChange(false)}
            >
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelBusy}
              onClick={runCancel}
            >
              {isCancelBusy ? <InlineSpinner /> : null}
              Cancel application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRotateOpen} onOpenChange={handleRotateOpenChange}>
        <DialogContent showCloseButton={!isRotateBusy}>
          <DialogHeader>
            <DialogTitle>Generate a new invite link?</DialogTitle>
            <DialogDescription>
              Creates a new link for this guest. The current link will stop
              working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isRotateBusy}
              onClick={() => handleRotateOpenChange(false)}
            >
              Keep current
            </Button>
            <Button
              type="button"
              disabled={isRotateBusy}
              onClick={() => runOpen(true)}
            >
              {isRotateBusy ? <InlineSpinner /> : null}
              Generate new link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent showCloseButton={!isDeleteBusy}>
          <DialogHeader>
            <DialogTitle>Hard-delete registration?</DialogTitle>
            <DialogDescription>
              Permanently deletes the application and documents. You can reopen
              registration afterward.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleteBusy}
              onClick={() => handleDeleteOpenChange(false)}
            >
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleteBusy}
              onClick={runDelete}
            >
              {isDeleteBusy ? <InlineSpinner /> : null}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConnectOpen} onOpenChange={handleConnectOpenChange}>
        <DialogContent showCloseButton={!isConnectBusy}>
          <DialogHeader>
            <DialogTitle>
              {application?.user_id ? "Change linked user" : "Connect to user"}
            </DialogTitle>
            <DialogDescription>
              Link this registration form to an existing account. You can
              change the linked user later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="guest-link-user" label="User" hint="Required" />
            {linkUsers.length > 5 ? (
              <Input
                id="guest-link-user-filter"
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                placeholder="Filter by name or email"
                disabled={isConnectBusy}
              />
            ) : null}
            <Select
              value={selectedUserId || null}
              items={userSelectItems}
              onValueChange={(value) => {
                if (!value) return;
                setSelectedUserId(value);
              }}
              disabled={isConnectBusy || filteredLinkUsers.length === 0}
            >
              <SelectTrigger
                id="guest-link-user"
                aria-invalid={Boolean(connectUserError)}
                className="w-full"
              >
                <SelectValue placeholder="Select a user">
                  {selectedUserLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredLinkUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {userOptionLabel(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {connectUserError ? (
              <p className="text-sm text-destructive">{connectUserError}</p>
            ) : null}
            {linkUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No users are available to connect.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isConnectBusy}
              onClick={() => handleConnectOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isConnectBusy || !selectedUserId}
              onClick={runConnect}
            >
              {isConnectBusy ? <InlineSpinner /> : null}
              {application?.user_id ? "Update link" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
