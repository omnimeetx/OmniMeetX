"use client"

import { Switch } from "@/components/ui/switch"
import { setMotionEnabled, useMotionEnabled } from "@/lib/motion"

/** Footer switch. Windows can turn animations off system-wide, so people can turn them back on here. */
export default function AnimationsSwitch() {
  const enabled = useMotionEnabled()

  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5" title="Saved on this device. Overrides your system animation setting.">
      <span className="label-mono">Animations {enabled ? "on" : "off"}</span>
      <Switch checked={enabled} onCheckedChange={setMotionEnabled} aria-label="Animations" data-testid="animations-switch" />
    </label>
  )
}
