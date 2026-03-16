"use client"

import React, { useState, useEffect } from "react"
import { submitNpsSurvey, dismissNpsSurvey } from "@/app/actions/survey"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type SurveyStep = "PROMPT" | "SURVEY" | "CLOSED"

export function NpsSurveyPopup() {
  const [step, setStep] = useState<SurveyStep>("CLOSED")
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [role, setRole] = useState("")
  const [allowContact, setAllowContact] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Delay the popup so it doesn't immediately overwhelm the user on login
    const timer = setTimeout(() => {
      setStep("PROMPT")
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = async () => {
    setStep("CLOSED")
    await dismissNpsSurvey()
  }

  const handleStartSurvey = () => {
    setStep("SURVEY")
  }

  const handleSubmit = async () => {
    if (score === null) {
      toast.error("Please select a score from 0-10.")
      return
    }
    if (!role) {
      toast.error("Please select your role.")
      return
    }

    setIsSubmitting(true)
    const res = await submitNpsSurvey({
      score,
      feedback,
      role,
      allowContact,
    })

    setIsSubmitting(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Thank you for your feedback!")
      setStep("CLOSED")
    }
  }

  if (step === "CLOSED") return null

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open) handleDismiss()
    }}>
      <DialogContent className="sm:max-w-[500px]">
        {step === "PROMPT" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Have a little time?</DialogTitle>
              <DialogDescription className="text-base mt-2">
                It will take two minutes to complete, and your feedback directly helps us improve your experience on EdUmeetup!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex sm:justify-between space-x-2">
              <Button variant="outline" onClick={handleDismiss}>
                Not interested at this time
              </Button>
              <Button onClick={handleStartSurvey}>
                Take a survey
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "SURVEY" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl border-b pb-4">Quick Survey</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              
              <div className="space-y-4">
                <Label className="text-base">
                  How likely is it that you would recommend EdUmeetup to a colleague or friend?
                </Label>
                <div className="flex flex-wrap gap-1 justify-between">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setScore(num)}
                      className={`h-10 w-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border text-sm font-medium transition-colors ${score === num ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="feedback" className="text-sm font-semibold">
                  Why? Tell us more about why you would or would not recommend EdUmeetup.
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Your feedback (optional)"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="role" className="text-sm font-semibold">
                  Which of the following best describes your role?
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student / Applicant</SelectItem>
                    <SelectItem value="University Representative">University Representative</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="allowContact"
                  checked={allowContact}
                  onChange={(e) => setAllowContact(e.target.checked)}
                />
                <Label
                  htmlFor="allowContact"
                  className="text-sm leading-none font-normal cursor-pointer"
                >
                  A member of the support team may contact me to learn more about my responses
                </Label>
              </div>

            </div>
            <DialogFooter className="flex sm:justify-between items-center sm:space-x-2 mt-2">
              <Button type="button" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
