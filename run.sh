#!/bin/bash
# ════════════════════════════════════════════════════════════════
#   WhatsApp Shopify Bot — تشغيل بأمر واحد
#   الاستخدام:  bash run.sh
# ════════════════════════════════════════════════════════════════

set -e

# ─── ألوان ───────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         WhatsApp Shopify Bot — تشغيل البوت           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── التحقق من Node.js ───────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js غير مثبت!${NC}"
  echo "   ثبّته من: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 16 ]; then
  echo -e "${RED}❌ يلزم Node.js الإصدار 16 أو أحدث (الحالي: $(node --version))${NC}"
  echo "   حدّث Node.js من: https://nodejs.org"
  exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# ─── تثبيت المكتبات ──────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo ""
  echo -e "${YELLOW}📦 جاري تثبيت المكتبات (قد يأخذ دقيقة)...${NC}"
  npm install
  echo -e "${GREEN}✅ تم تثبيت المكتبات${NC}"
else
  echo -e "${GREEN}✅ المكتبات مثبتة${NC}"
fi

# ─── تشغيل الإعداد / البوت ───────────────────────────────────────
echo ""

# هل الـ Token موجود بالفعل في .env؟
if grep -q "^SHOPIFY_ADMIN_TOKEN=shpat_\|^SHOPIFY_ADMIN_TOKEN=shpss_" .env 2>/dev/null && \
   [ -n "$(grep "^SHOPIFY_ADMIN_TOKEN=" .env | cut -d'=' -f2)" ]; then
  echo -e "${GREEN}✅ Shopify Token موجود — جاري تشغيل البوت مباشرةً...${NC}"
  echo ""
  node src/index.js
else
  echo -e "${YELLOW}🔑 لم يُعثر على Shopify Token — جاري إعداد الاتصال...${NC}"
  echo -e "   سيفتح المتصفح تلقائياً — وافق على الصلاحيات ثم عُد هنا."
  echo ""
  node setup.js
fi
