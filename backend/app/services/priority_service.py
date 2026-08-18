def compute_priority_score(severity: int, report_count: int) -> float:
    """
    Priority score = severity (1-5) × log-scaled report_count.
    Higher score → shown first in admin dashboard.

    Examples:
      severity=5, count=1  → 5.0
      severity=3, count=4  → ~4.2
      severity=2, count=10 → ~4.6
    """
    import math
    return round(severity * math.log1p(report_count), 4)
