import 'package:http/http.dart' as http;

extension HttpResponseExtension on http.Response {
  bool ok() {
    return statusCode >= 200 && statusCode < 300;
  }
}