from django.http import JsonResponse
from django.views import View

from .logic import get_logic


class SuggestionsView(View):
    def get(self, request):
        q = request.GET.get("q", "").strip()
        if not q:
            return JsonResponse([], safe=False)
        results = get_logic().get_suggestions(q, limit=8)
        return JsonResponse(results, safe=False)


class CountriesView(View):
    def get(self, request):
        return JsonResponse(get_logic().get_all_country_records(), safe=False)


class CountryView(View):
    def get(self, request):
        q = request.GET.get("q", "").strip()
        if not q:
            return JsonResponse({"error": "q is required"}, status=400)
        result = get_logic().get_country_info(q)
        if result is None:
            return JsonResponse({"error": f"Country not found: {q!r}"}, status=404)
        return JsonResponse(result)


class ExtraView(View):
    def get(self, request):
        code = request.GET.get("code", "").strip()
        if not code:
            return JsonResponse({"error": "code is required"}, status=400)
        result = get_logic().fetch_extra_info(code)
        return JsonResponse(result)


class HealthView(View):
    def get(self, request):
        logic = get_logic()
        return JsonResponse({"status": "ok", "countries": len(logic.country_names)})
