export const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch (_e) {
    return value;
  }
};
