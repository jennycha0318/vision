import SwiftUI
import WidgetKit

// src/lib/widget.ts 의 APP_GROUP 과 같아야 한다
private let appGroup = "group.com.jennycha.visionboard"

struct VisionEntry: TimelineEntry {
  let date: Date
  let image: UIImage?
  let score: Int
  let streak: Int
  let summary: String
  /** 최근 7일 안에 기록이 없으면 그림이 조용해진다 */
  let quiet: Bool
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> VisionEntry {
    VisionEntry(date: .now, image: nil, score: 0, streak: 0, summary: "나의 비전", quiet: false)
  }

  func getSnapshot(in context: Context, completion: @escaping (VisionEntry) -> Void) {
    completion(load(at: .now))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<VisionEntry>) -> Void) {
    // 한 시간 간격으로 12개 — 시간대에 따라 그림의 빛이 바뀐다
    let now = Date()
    let entries = (0..<12).compactMap { hour in
      Calendar.current.date(byAdding: .hour, value: hour, to: now).map { load(at: $0) }
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }

  private func load(at date: Date) -> VisionEntry {
    let defaults = UserDefaults(suiteName: appGroup)
    var image: UIImage?
    if let b64 = defaults?.string(forKey: "snapshot"), let data = Data(base64Encoded: b64) {
      image = UIImage(data: data)
    }
    let last = defaults?.string(forKey: "lastRecord") ?? ""
    return VisionEntry(
      date: date,
      image: image,
      score: defaults?.integer(forKey: "score") ?? 0,
      streak: defaults?.integer(forKey: "streak") ?? 0,
      summary: defaults?.string(forKey: "summary") ?? "",
      quiet: isQuiet(lastRecord: last, now: date)
    )
  }

  private func isQuiet(lastRecord: String, now: Date) -> Bool {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    f.timeZone = .current
    guard let last = f.date(from: lastRecord) else { return false }
    let days = Calendar.current.dateComponents([.day], from: last, to: now).day ?? 0
    return days >= 7
  }
}

/// 시간대별로 그림 위에 얹는 빛
private func timeTint(_ date: Date) -> (Color, Double) {
  let hour = Calendar.current.component(.hour, from: date)
  switch hour {
  case 5..<9: return (Color(red: 1.0, green: 0.85, blue: 0.7), 0.18)   // 아침
  case 9..<17: return (.clear, 0)                                       // 낮
  case 17..<21: return (Color(red: 1.0, green: 0.55, blue: 0.35), 0.2)  // 저녁
  default: return (Color(red: 0.1, green: 0.12, blue: 0.3), 0.3)        // 밤
  }
}

struct VisionWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: VisionEntry

  var body: some View {
    if entry.image == nil {
      VStack(spacing: 6) {
        Image(systemName: "sparkles").font(.title2).foregroundStyle(Color("$accent"))
        Text("앱에서 비전을 만들어주세요")
          .font(.caption)
          .multilineTextAlignment(.center)
          .foregroundStyle(.secondary)
      }
      .containerBackground(for: .widget) { Color("$widgetBackground") }
    } else {
      VStack(alignment: .leading, spacing: 2) {
        Spacer()
        if family != .systemSmall && !entry.summary.isEmpty {
          Text(entry.summary)
            .font(.caption)
            .fontWeight(.medium)
            .lineLimit(2)
            .foregroundStyle(.white.opacity(0.92))
        }
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          Text("\(min(entry.score, 100))%")
            .font(.system(size: family == .systemSmall ? 22 : 26, weight: .heavy))
            .foregroundStyle(.white)
          if entry.streak > 0 {
            Text("\(entry.streak)일 연속")
              .font(.caption2)
              .foregroundStyle(.white.opacity(0.8))
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(14)
      .containerBackground(for: .widget) { background }
      .widgetURL(URL(string: "visionboard://"))
    }
  }

  private var background: some View {
    let (tint, strength) = timeTint(entry.date)
    return ZStack {
      Image(uiImage: entry.image!)
        .resizable()
        .scaledToFill()
        .saturation(entry.quiet ? 0.55 : 1)
        .brightness(entry.quiet ? -0.05 : 0)
      tint.opacity(strength).blendMode(.softLight)
      LinearGradient(
        colors: [.clear, .black.opacity(0.55)],
        startPoint: .center,
        endPoint: .bottom
      )
    }
  }
}

@main
struct VisionWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "VisionWidget", provider: Provider()) { entry in
      VisionWidgetView(entry: entry)
    }
    .configurationDisplayName("나의 비전")
    .description("채워지고 있는 비전 그림을 홈 화면에서 봐요.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    .contentMarginsDisabled()
  }
}
