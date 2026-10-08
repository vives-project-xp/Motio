"""Gear ratios for the motion links (Fusion does not simulate tooth contact)."""


def motion_link_text(driver_name: str, driver_teeth: int, driven_name: str, driven_teeth: int) -> str:
    """Two meshing gears turn in opposite directions, at the inverse ratio of their teeth."""
    driven_angle = 360.0 * driver_teeth / driven_teeth
    return f"{driver_name} 360 deg  <->  {driven_name} {driven_angle:g} deg  (Reverse on)"
